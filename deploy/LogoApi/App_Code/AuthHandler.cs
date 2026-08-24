using System;
using System.Collections;
using System.Collections.Generic;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text;
using System.Web;
using System.Web.Script.Serialization;

namespace BeraLogoApi
{
    /// <summary>
    /// POST-only HMAC token mint. Password is verified against Firestore
    /// users/{USERCODE}.passwordHash (bcryptjs-compatible). Token claims
    /// come only from that document — never from the client body.
    /// </summary>
    public class AuthHandler : IHttpHandler
    {
        const string InvalidCredentials = "Kullanıcı kodu veya şifre hatalı";
        const string InactiveUser = "Kullanıcı hesabı pasif durumdadır.";

        public bool IsReusable
        {
            get { return false; }
        }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.TrySkipIisCustomErrors = true;
            context.Response.Charset = "utf-8";
            context.Response.ContentEncoding = Encoding.UTF8;
            AddCors(context);

            var method = context.Request.HttpMethod ?? "GET";
            if (string.Equals(method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 204;
                return;
            }

            if (!string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = 405;
                WriteJson(context, ErrorBody("Yalnızca POST kabul edilir."));
                return;
            }

            string userCode;
            string password;
            if (!TryReadCredentials(context, out userCode, out password))
            {
                context.Response.StatusCode = 400;
                WriteJson(context, ErrorBody("userCode ve password zorunludur."));
                return;
            }

            userCode = NormalizeUserCode(userCode);
            if (userCode.Length == 0 || password.Length == 0)
            {
                context.Response.StatusCode = 400;
                WriteJson(context, ErrorBody("userCode ve password zorunludur."));
                return;
            }

            try
            {
                var secret = ReadSecret();
                var ttlHours = ReadTtlHours();
                var user = FetchFirestoreUser(userCode);
                if (user == null)
                {
                    context.Response.StatusCode = 401;
                    WriteJson(context, ErrorBody(InvalidCredentials));
                    return;
                }

                if (!user.Active || user.IsDeleted)
                {
                    context.Response.StatusCode = 401;
                    WriteJson(context, ErrorBody(InactiveUser));
                    return;
                }

                if (string.IsNullOrEmpty(user.Role) || !IsKnownRole(user.Role))
                {
                    context.Response.StatusCode = 401;
                    WriteJson(context, ErrorBody(InvalidCredentials));
                    return;
                }

                if (!BcryptCompat.Verify(password, user.PasswordHash))
                {
                    context.Response.StatusCode = 401;
                    WriteJson(context, ErrorBody(InvalidCredentials));
                    return;
                }

                var now = DateTimeOffset.UtcNow;
                var expAt = now.AddHours(ttlHours);
                var payload = new BeraTokenPayload
                {
                    UserCode = user.UserCode,
                    Role = user.Role,
                    SalesRepCodes = user.SalesRepCodes ?? new List<string>(),
                    MerchCustomerCodes = user.MerchCustomerCodes ?? new List<string>(),
                    MerchCustomerPatterns = user.MerchCustomerPatterns ?? new List<string>(),
                    ReportingStockGroupCode = user.ReportingStockGroupCode ?? string.Empty,
                    ReportingSalesSql = user.ReportingSalesSql ?? string.Empty,
                    Iat = now.ToUnixTimeSecondsCompat(),
                    Exp = expAt.ToUnixTimeSecondsCompat()
                };
                var token = BeraToken.Create(payload, secret);

                var response = new Dictionary<string, object>();
                response["success"] = true;
                response["token"] = token;
                response["expiresAt"] = expAt.UtcDateTime.ToString(
                    "yyyy-MM-ddTHH:mm:ssZ",
                    CultureInfo.InvariantCulture);
                var publicUser = new Dictionary<string, object>();
                publicUser["userCode"] = user.UserCode;
                publicUser["role"] = user.Role;
                response["user"] = publicUser;

                context.Response.StatusCode = 200;
                WriteJson(context, response);
            }
            catch (ConfigurationErrorsException ex)
            {
                context.Response.StatusCode = 500;
                WriteJson(context, ErrorBody(ex.Message));
            }
            catch (WebException ex)
            {
                context.Response.StatusCode = 500;
                WriteJson(context, ErrorBody("Firestore kullanıcı kaydı okunamadı."));
                TryLog(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                context.Response.StatusCode = 500;
                WriteJson(context, ErrorBody(ex.Message));
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = 500;
                WriteJson(context, ErrorBody(
                    "Kimlik doğrulama sorgusu başarısız. exType=" + ex.GetType().FullName
                    + " exMessage=" + ex.Message));
                TryLog(ex.Message);
            }
        }

        static void AddCors(HttpContext context)
        {
            context.Response.AddHeader("Access-Control-Allow-Origin", "*");
            context.Response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            context.Response.AddHeader("Access-Control-Allow-Headers", "Accept, Content-Type, Authorization");
        }

        static void WriteJson(HttpContext context, object body)
        {
            context.Response.Write(new JavaScriptSerializer().Serialize(body));
        }

        static Dictionary<string, object> ErrorBody(string message)
        {
            var d = new Dictionary<string, object>();
            d["success"] = false;
            d["error"] = message;
            return d;
        }

        static void TryLog(string message)
        {
            try
            {
                if (!string.IsNullOrEmpty(message)
                    && message.IndexOf("password", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    System.Diagnostics.Trace.WriteLine("[AuthHandler] " + message);
                }
            }
            catch
            {
            }
        }

        static bool TryReadCredentials(HttpContext context, out string userCode, out string password)
        {
            userCode = null;
            password = null;
            string body;
            using (var reader = new StreamReader(context.Request.InputStream, Encoding.UTF8))
            {
                body = reader.ReadToEnd();
            }
            if (string.IsNullOrWhiteSpace(body)) return false;

            Dictionary<string, object> parsed;
            try
            {
                parsed = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(body);
            }
            catch
            {
                return false;
            }
            if (parsed == null) return false;

            object codeObj;
            object passObj;
            if (parsed.TryGetValue("userCode", out codeObj) && codeObj != null)
            {
                userCode = Convert.ToString(codeObj, CultureInfo.InvariantCulture);
            }
            if (parsed.TryGetValue("password", out passObj) && passObj != null)
            {
                password = Convert.ToString(passObj, CultureInfo.InvariantCulture);
            }
            return !string.IsNullOrWhiteSpace(userCode) && password != null && password.Length > 0;
        }

        static string NormalizeUserCode(string userCode)
        {
            return (userCode ?? string.Empty).Trim().ToUpperInvariant();
        }

        static bool IsKnownRole(string role)
        {
            return role == "admin" || role == "salesRep" || role == "merch"
                || role == "depot" || role == "packaging" || role == "reporting"
                || role == "management";
        }

        static string ReadSecret()
        {
            var secret = ConfigurationManager.AppSettings["BeraTokenSecret"];
            if (string.IsNullOrWhiteSpace(secret))
            {
                throw new ConfigurationErrorsException(
                    "BeraTokenSecret tanımlı değil (web.config appSettings). HMAC token üretilemez.");
            }
            return secret.Trim();
        }

        static int ReadTtlHours()
        {
            var raw = ConfigurationManager.AppSettings["BeraTokenTtlHours"];
            int hours;
            if (!string.IsNullOrWhiteSpace(raw)
                && int.TryParse(raw.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out hours)
                && hours > 0
                && hours <= 168)
            {
                return hours;
            }
            return BeraToken.DefaultTtlHours;
        }

        static FirestoreUser FetchFirestoreUser(string userCode)
        {
            var projectId = ConfigurationManager.AppSettings["BeraFirestoreProjectId"];
            if (string.IsNullOrWhiteSpace(projectId))
            {
                throw new ConfigurationErrorsException(
                    "BeraFirestoreProjectId tanımlı değil (web.config appSettings).");
            }

            ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;

            var url = "https://firestore.googleapis.com/v1/projects/"
                + Uri.EscapeDataString(projectId.Trim())
                + "/databases/(default)/documents/users/"
                + Uri.EscapeDataString(userCode);
            var apiKey = ConfigurationManager.AppSettings["BeraFirebaseApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                url += "?key=" + Uri.EscapeDataString(apiKey.Trim());
            }

            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Accept = "application/json";
            request.Timeout = 15000;

            HttpWebResponse response;
            try
            {
                response = (HttpWebResponse)request.GetResponse();
            }
            catch (WebException ex)
            {
                var http = ex.Response as HttpWebResponse;
                if (http != null && http.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }
                throw;
            }

            using (response)
            using (var stream = response.GetResponseStream())
            using (var reader = new StreamReader(stream, Encoding.UTF8))
            {
                var json = reader.ReadToEnd();
                return ParseFirestoreUser(userCode, json);
            }
        }

        static FirestoreUser ParseFirestoreUser(string fallbackCode, string json)
        {
            var ser = new JavaScriptSerializer();
            ser.MaxJsonLength = int.MaxValue;
            var root = ser.Deserialize<Dictionary<string, object>>(json);
            if (root == null) return null;
            object fieldsObj;
            if (!root.TryGetValue("fields", out fieldsObj)) return null;
            var fields = fieldsObj as Dictionary<string, object>;
            if (fields == null) return null;

            var user = new FirestoreUser();
            user.UserCode = NormalizeUserCode(ReadStringField(fields, "userCode"));
            if (user.UserCode.Length == 0) user.UserCode = fallbackCode;
            user.Role = ReadStringField(fields, "role");
            user.PasswordHash = ReadStringField(fields, "passwordHash");
            user.Active = ReadBoolField(fields, "active", true);
            user.IsDeleted = ReadBoolField(fields, "isDeleted", false);
            user.SalesRepCodes = ReadStringArrayField(fields, "salesRepCodes");
            user.MerchCustomerCodes = ReadStringArrayField(fields, "merchCustomerCodes");
            user.MerchCustomerPatterns = ReadStringArrayField(fields, "merchCustomerPatterns");
            user.ReportingStockGroupCode = ReadStringField(fields, "reportingStockAuthorityCode");
            user.ReportingSalesSql = ReadStringField(fields, "reportingSalesSql");
            return user;
        }

        static string ReadStringField(Dictionary<string, object> fields, string name)
        {
            object node;
            if (!fields.TryGetValue(name, out node)) return string.Empty;
            var map = node as Dictionary<string, object>;
            if (map == null) return string.Empty;
            object value;
            if (map.TryGetValue("stringValue", out value) && value != null)
            {
                return Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
            }
            return string.Empty;
        }

        static bool ReadBoolField(Dictionary<string, object> fields, string name, bool fallback)
        {
            object node;
            if (!fields.TryGetValue(name, out node)) return fallback;
            var map = node as Dictionary<string, object>;
            if (map == null) return fallback;
            object value;
            if (map.TryGetValue("booleanValue", out value) && value is bool)
            {
                return (bool)value;
            }
            return fallback;
        }

        static List<string> ReadStringArrayField(Dictionary<string, object> fields, string name)
        {
            var list = new List<string>();
            object node;
            if (!fields.TryGetValue(name, out node)) return list;
            var map = node as Dictionary<string, object>;
            if (map == null) return list;
            object arrayObj;
            if (!map.TryGetValue("arrayValue", out arrayObj)) return list;
            var arrayMap = arrayObj as Dictionary<string, object>;
            if (arrayMap == null) return list;
            object valuesObj;
            if (!arrayMap.TryGetValue("values", out valuesObj)) return list;
            var values = valuesObj as IEnumerable;
            if (values == null) return list;
            foreach (var item in values)
            {
                var itemMap = item as Dictionary<string, object>;
                if (itemMap == null) continue;
                object sv;
                if (itemMap.TryGetValue("stringValue", out sv) && sv != null)
                {
                    var s = Convert.ToString(sv, CultureInfo.InvariantCulture);
                    if (!string.IsNullOrWhiteSpace(s)) list.Add(s.Trim());
                }
            }
            return list;
        }

        sealed class FirestoreUser
        {
            public string UserCode;
            public string Role;
            public string PasswordHash;
            public bool Active;
            public bool IsDeleted;
            public List<string> SalesRepCodes;
            public List<string> MerchCustomerCodes;
            public List<string> MerchCustomerPatterns;
            public string ReportingStockGroupCode;
            public string ReportingSalesSql;
        }
    }

    /// <summary>
    /// Verifies hashes produced by the mobile app (bcryptjs, cost 10).
    /// Loads BCrypt.Net / BCrypt.Net-Next from bin at runtime so App_Code
    /// still compiles if the DLL is not yet deployed.
    /// </summary>
    static class BcryptCompat
    {
        static string lastLoadDiag = "";
        static object hashTypeNone;

        public static bool Verify(string password, string hash)
        {
            if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(hash))
            {
                return false;
            }

            var method = ResolveVerify();
            if (method == null)
            {
                throw new InvalidOperationException(
                    "BCrypt.Net-Next.dll (veya BCrypt.Net.dll) LogoApi/bin altında yok. "
                    + "Mobil bcryptjs (cost 10) hash doğrulaması için gerekli. "
                    + lastLoadDiag);
            }

            try
            {
                var result = method.Invoke(null, new object[] { password, hash, false, hashTypeNone });
                return result is bool && (bool)result;
            }
            catch (TargetInvocationException ex)
            {
                if (ex.InnerException != null) throw ex.InnerException;
                throw;
            }
        }

        static MethodInfo ResolveVerify()
        {
            Type type = null;

            var live = TryLoadFromBin("BCrypt-Net-Next.dll");
            if (live != null)
            {
                type = live.GetType("BCrypt.Net.BCrypt");
                Note("GetType=" + (type != null ? type.FullName : "null")
                    + " asm=" + live.FullName);
            }

            if (type == null)
            {
                type = Type.GetType("BCrypt.Net.BCrypt, BCrypt-Net-Next")
                    ?? Type.GetType("BCrypt.Net.BCrypt, BCrypt.Net-Next")
                    ?? Type.GetType("BCrypt.Net.BCrypt, BCrypt.Net");
            }

            if (type == null)
            {
                TryLoadFromBin("BCrypt.Net-Next.dll");
                TryLoadFromBin("BCrypt.Net.dll");
                type = Type.GetType("BCrypt.Net.BCrypt, BCrypt-Net-Next")
                    ?? Type.GetType("BCrypt.Net.BCrypt, BCrypt.Net-Next")
                    ?? Type.GetType("BCrypt.Net.BCrypt, BCrypt.Net");
            }

            if (type == null)
            {
                foreach (var asm in AppDomain.CurrentDomain.GetAssemblies())
                {
                    type = asm.GetType("BCrypt.Net.BCrypt");
                    if (type != null) break;
                }
            }
            if (type == null) return null;

            var hashType = type.Assembly.GetType("BCrypt.Net.HashType");
            if (hashType == null)
            {
                Note("HashType=null");
                return null;
            }

            try
            {
                hashTypeNone = Enum.Parse(hashType, "None");
            }
            catch (Exception ex)
            {
                Note("HashType.None FAILED exType=" + ex.GetType().FullName
                    + " exMessage=" + ex.Message);
                return null;
            }

            var verify = type.GetMethod(
                "Verify",
                new[] { typeof(string), typeof(string), typeof(bool), hashType });
            Note("VerifyMethod=" + (verify != null ? verify.ToString() : "null")
                + " HashType.None=" + (hashTypeNone == null ? "null" : hashTypeNone.ToString()));
            return verify;
        }

        static Assembly TryLoadFromBin(string fileName)
        {
            string mapped = null;
            bool exists = false;
            try
            {
                var ctx = HttpContext.Current;
                if (ctx == null)
                {
                    Note("file=" + fileName + " HttpContext.Current=null");
                    return null;
                }
                mapped = ctx.Server.MapPath("~/bin/" + fileName);
                exists = !string.IsNullOrEmpty(mapped) && File.Exists(mapped);
                Note("file=" + fileName + " mapPath=" + mapped + " exists=" + exists);
                if (!exists) return null;

                var asm = Assembly.LoadFrom(mapped);
                Note("LoadFrom OK name=" + (asm == null ? "null" : asm.GetName().Name));
                return asm;
            }
            catch (Exception ex)
            {
                Note("LoadFrom FAILED file=" + fileName
                    + " mapPath=" + mapped
                    + " exists=" + exists
                    + " exType=" + ex.GetType().FullName
                    + " exMessage=" + ex.Message);
            }
            return null;
        }

        static void Note(string message)
        {
            lastLoadDiag = (lastLoadDiag ?? "") + " | " + message;
            try
            {
                if (string.IsNullOrEmpty(message)) return;
                if (message.IndexOf("password", StringComparison.OrdinalIgnoreCase) >= 0) return;
                if (message.IndexOf("passwordHash", StringComparison.OrdinalIgnoreCase) >= 0) return;
                if (message.IndexOf("token", StringComparison.OrdinalIgnoreCase) >= 0) return;
                if (message.IndexOf("secret", StringComparison.OrdinalIgnoreCase) >= 0) return;
                System.Diagnostics.Trace.WriteLine("[AuthHandler] " + message);
            }
            catch
            {
            }
        }
    }
}
