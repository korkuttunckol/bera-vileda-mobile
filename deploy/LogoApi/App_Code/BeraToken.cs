using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace BeraLogoApi
{
    /// <summary>
    /// Compact HMAC-SHA256 token: v1.{payloadB64}.{hmacB64}
    /// Payload is canonical JSON (sorted keys, no whitespace). HMAC is over
    /// the UTF-8 bytes of "v1." + payloadB64. Secret never goes into the token.
    /// </summary>
    public sealed class BeraTokenPayload
    {
        public string UserCode;
        public string Role;
        public List<string> SalesRepCodes;
        public List<string> MerchCustomerCodes;
        public List<string> MerchCustomerPatterns;
        public string ReportingStockGroupCode;
        public string ReportingSalesSql;
        public long Iat;
        public long Exp;
    }

    public static class BeraToken
    {
        public const string VersionPrefix = "v1";
        public const int DefaultTtlHours = 12;

        public static string Create(BeraTokenPayload payload, string secret)
        {
            if (payload == null) throw new ArgumentNullException("payload");
            EnsureSecret(secret);
            var payloadB64 = ToBase64Url(Encoding.UTF8.GetBytes(ToCanonicalJson(payload)));
            var mac = ComputeMac(payloadB64, secret);
            return VersionPrefix + "." + payloadB64 + "." + ToBase64Url(mac);
        }

        public static BeraTokenPayload Parse(string token)
        {
            string payloadB64;
            Split(token, out payloadB64);
            var json = Encoding.UTF8.GetString(FromBase64Url(payloadB64));
            return FromCanonicalJson(json);
        }

        public static bool VerifySignature(string token, string secret)
        {
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(secret))
            {
                return false;
            }

            try
            {
                string payloadB64;
                string macB64;
                Split(token, out payloadB64, out macB64);
                var expected = ComputeMac(payloadB64, secret);
                var actual = FromBase64Url(macB64);
                return FixedEquals(expected, actual);
            }
            catch
            {
                return false;
            }
        }

        public static bool ValidateExpiration(BeraTokenPayload payload)
        {
            if (payload == null) return false;
            var now = DateTimeOffset.UtcNow.ToUnixTimeSecondsCompat();
            return payload.Exp > now;
        }

        public static bool TryValidate(
            string token,
            string secret,
            out BeraTokenPayload payload,
            out string error)
        {
            payload = null;
            error = null;
            if (string.IsNullOrWhiteSpace(token))
            {
                error = "Token yok.";
                return false;
            }
            if (!VerifySignature(token, secret))
            {
                error = "Token imzası geçersiz.";
                return false;
            }
            try
            {
                payload = Parse(token);
            }
            catch
            {
                error = "Token okunamadı.";
                return false;
            }
            if (!ValidateExpiration(payload))
            {
                error = "Token süresi doldu.";
                payload = null;
                return false;
            }
            return true;
        }

        public static void EnsureSecret(string secret)
        {
            if (string.IsNullOrWhiteSpace(secret))
            {
                throw new InvalidOperationException(
                    "BeraTokenSecret tanımlı değil (web.config appSettings).");
            }
        }

        static byte[] ComputeMac(string payloadB64, string secret)
        {
            var message = Encoding.UTF8.GetBytes(VersionPrefix + "." + payloadB64);
            using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret)))
            {
                return hmac.ComputeHash(message);
            }
        }

        static void Split(string token, out string payloadB64)
        {
            string macB64;
            Split(token, out payloadB64, out macB64);
        }

        static void Split(string token, out string payloadB64, out string macB64)
        {
            payloadB64 = null;
            macB64 = null;
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new FormatException("Token boş.");
            }
            var parts = token.Split('.');
            if (parts.Length != 3 || parts[0] != VersionPrefix
                || string.IsNullOrEmpty(parts[1]) || string.IsNullOrEmpty(parts[2]))
            {
                throw new FormatException("Token biçimi v1.{payload}.{hmac} olmalıdır.");
            }
            payloadB64 = parts[1];
            macB64 = parts[2];
        }

        /// <summary>
        /// Sorted keys, no whitespace. Arrays keep stored order.
        /// </summary>
        public static string ToCanonicalJson(BeraTokenPayload payload)
        {
            var sb = new StringBuilder();
            sb.Append('{');
            AppendNumber(sb, "exp", payload.Exp);
            sb.Append(',');
            AppendNumber(sb, "iat", payload.Iat);
            sb.Append(',');
            AppendStringArray(sb, "merchCustomerCodes", payload.MerchCustomerCodes);
            sb.Append(',');
            AppendStringArray(sb, "merchCustomerPatterns", payload.MerchCustomerPatterns);
            sb.Append(',');
            AppendString(sb, "reportingSalesSql", payload.ReportingSalesSql ?? string.Empty);
            sb.Append(',');
            AppendString(sb, "reportingStockGroupCode", payload.ReportingStockGroupCode ?? string.Empty);
            sb.Append(',');
            AppendString(sb, "role", payload.Role ?? string.Empty);
            sb.Append(',');
            AppendStringArray(sb, "salesRepCodes", payload.SalesRepCodes);
            sb.Append(',');
            AppendString(sb, "userCode", payload.UserCode ?? string.Empty);
            sb.Append('}');
            return sb.ToString();
        }

        static BeraTokenPayload FromCanonicalJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json) || json[0] != '{')
            {
                throw new FormatException("Token payload JSON değil.");
            }
            var payload = new BeraTokenPayload
            {
                SalesRepCodes = new List<string>(),
                MerchCustomerCodes = new List<string>(),
                MerchCustomerPatterns = new List<string>()
            };
            payload.UserCode = ReadJsonString(json, "userCode");
            payload.Role = ReadJsonString(json, "role");
            payload.Iat = ReadJsonInt64(json, "iat");
            payload.Exp = ReadJsonInt64(json, "exp");
            payload.SalesRepCodes = ReadJsonStringArray(json, "salesRepCodes");
            payload.MerchCustomerCodes = ReadJsonStringArray(json, "merchCustomerCodes");
            payload.MerchCustomerPatterns = ReadJsonStringArray(json, "merchCustomerPatterns");
            payload.ReportingSalesSql = ReadJsonString(json, "reportingSalesSql");
            payload.ReportingStockGroupCode = ReadJsonString(json, "reportingStockGroupCode");
            if (string.IsNullOrEmpty(payload.UserCode) || string.IsNullOrEmpty(payload.Role))
            {
                throw new FormatException("Token payload eksik.");
            }
            return payload;
        }

        static void AppendString(StringBuilder sb, string key, string value)
        {
            sb.Append('"').Append(key).Append("\":");
            sb.Append(JsonEscape(value ?? string.Empty));
        }

        static void AppendNumber(StringBuilder sb, string key, long value)
        {
            sb.Append('"').Append(key).Append("\":");
            sb.Append(value.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }

        static void AppendStringArray(StringBuilder sb, string key, List<string> values)
        {
            sb.Append('"').Append(key).Append("\":[");
            if (values != null)
            {
                for (var i = 0; i < values.Count; i++)
                {
                    if (i > 0) sb.Append(',');
                    sb.Append(JsonEscape(values[i] ?? string.Empty));
                }
            }
            sb.Append(']');
        }

        static string JsonEscape(string value)
        {
            var sb = new StringBuilder();
            sb.Append('"');
            foreach (var c in value)
            {
                if (c == '"' || c == '\\') sb.Append('\\').Append(c);
                else if (c == '\n') sb.Append("\\n");
                else if (c == '\r') sb.Append("\\r");
                else if (c == '\t') sb.Append("\\t");
                else sb.Append(c);
            }
            sb.Append('"');
            return sb.ToString();
        }

        static string ReadJsonString(string json, string key)
        {
            var needle = "\"" + key + "\":";
            var i = json.IndexOf(needle, StringComparison.Ordinal);
            if (i < 0) return string.Empty;
            i += needle.Length;
            while (i < json.Length && json[i] == ' ') i++;
            if (i >= json.Length || json[i] != '"') return string.Empty;
            i++;
            var sb = new StringBuilder();
            while (i < json.Length)
            {
                var c = json[i++];
                if (c == '\\' && i < json.Length)
                {
                    sb.Append(json[i++]);
                    continue;
                }
                if (c == '"') break;
                sb.Append(c);
            }
            return sb.ToString();
        }

        static long ReadJsonInt64(string json, string key)
        {
            var needle = "\"" + key + "\":";
            var i = json.IndexOf(needle, StringComparison.Ordinal);
            if (i < 0) return 0;
            i += needle.Length;
            var start = i;
            while (i < json.Length && (char.IsDigit(json[i]) || json[i] == '-')) i++;
            long n;
            if (!long.TryParse(
                json.Substring(start, i - start),
                System.Globalization.NumberStyles.Integer,
                System.Globalization.CultureInfo.InvariantCulture,
                out n))
            {
                return 0;
            }
            return n;
        }

        static List<string> ReadJsonStringArray(string json, string key)
        {
            var list = new List<string>();
            var needle = "\"" + key + "\":[";
            var i = json.IndexOf(needle, StringComparison.Ordinal);
            if (i < 0) return list;
            i += needle.Length;
            while (i < json.Length)
            {
                while (i < json.Length && (json[i] == ' ' || json[i] == ',')) i++;
                if (i < json.Length && json[i] == ']') break;
                if (i >= json.Length || json[i] != '"') break;
                i++;
                var sb = new StringBuilder();
                while (i < json.Length)
                {
                    var c = json[i++];
                    if (c == '\\' && i < json.Length)
                    {
                        sb.Append(json[i++]);
                        continue;
                    }
                    if (c == '"') break;
                    sb.Append(c);
                }
                list.Add(sb.ToString());
            }
            return list;
        }

        static string ToBase64Url(byte[] data)
        {
            return Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        static byte[] FromBase64Url(string value)
        {
            var s = value.Replace('-', '+').Replace('_', '/');
            switch (s.Length % 4)
            {
                case 2: s += "=="; break;
                case 3: s += "="; break;
            }
            return Convert.FromBase64String(s);
        }

        static bool FixedEquals(byte[] a, byte[] b)
        {
            if (a == null || b == null || a.Length != b.Length) return false;
            var diff = 0;
            for (var i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
            return diff == 0;
        }
    }

    static class DateTimeOffsetUnix
    {
        public static long ToUnixTimeSecondsCompat(this DateTimeOffset value)
        {
            return (value.UtcTicks - 621355968000000000L) / TimeSpan.TicksPerSecond;
        }
    }
}
