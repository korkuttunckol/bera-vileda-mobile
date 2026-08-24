using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Script.Serialization;

namespace BeraLogoApi
{
    /// <summary>Runs only the ADMIN-configured reporting query embedded in a signed session token.</summary>
    public class SatisRaporuHandler : IHttpHandler
    {
        const int MaxRows = 30000;
        static readonly Regex ForbiddenSql = new Regex(@"\b(insert|update|delete|merge|drop|alter|create|exec|execute|grant|revoke|truncate|backup|restore|xp_)\b|--|/\*|;", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        public bool IsReusable { get { return false; } }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";
            AddCors(context);
            if (string.Equals(context.Request.HttpMethod, "OPTIONS", StringComparison.OrdinalIgnoreCase)) { context.Response.StatusCode = 204; return; }
            if (!string.Equals(context.Request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase)) { Fail(context, 405, "Yalnızca POST kabul edilir."); return; }
            try
            {
                BeraTokenPayload user;
                string error;
                if (!BeraToken.TryValidate(ReadBearer(context), ReadSecret(), out user, out error)) { Fail(context, 401, "Oturum doğrulanamadı."); return; }
                if (user.Role != "reporting" && user.Role != "admin") { Fail(context, 403, "Bu rapor için yetkiniz yok."); return; }
                if (string.IsNullOrWhiteSpace(user.ReportingSalesSql) || string.IsNullOrWhiteSpace(user.ReportingStockGroupCode)) { Fail(context, 400, "ADMIN rapor sorgusu veya stok grup kodu tanımlamamış."); return; }
                if (!IsSafeReadQuery(user.ReportingSalesSql)) { Fail(context, 400, "Rapor sorgusu yalnız tek bir SELECT/WITH sorgusu olabilir."); return; }
                if (user.ReportingSalesSql.IndexOf("@BaslangicTarihi", StringComparison.OrdinalIgnoreCase) < 0 || user.ReportingSalesSql.IndexOf("@BitisTarihi", StringComparison.OrdinalIgnoreCase) < 0 || user.ReportingSalesSql.IndexOf("@StokGrupKodu", StringComparison.OrdinalIgnoreCase) < 0) { Fail(context, 400, "Sorguda @BaslangicTarihi, @BitisTarihi ve @StokGrupKodu parametreleri bulunmalı."); return; }
                DateTime start, end;
                if (!TryReadDates(context, out start, out end) || end < start) { Fail(context, 400, "Geçerli başlangıç ve bitiş tarihi girin."); return; }
                var rows = Execute(user.ReportingSalesSql, start.Date, end.Date, user.ReportingStockGroupCode.Trim());
                context.Response.Write(new JavaScriptSerializer { MaxJsonLength = Int32.MaxValue }.Serialize(new Dictionary<string, object> { { "rows", rows }, { "count", rows.Count } }));
            }
            catch (Exception ex) { Fail(context, 500, "Satış raporu oluşturulamadı: " + ex.Message); }
        }

        static bool IsSafeReadQuery(string sql) { var s = sql.Trim(); if (s.EndsWith(";", StringComparison.Ordinal)) s = s.Substring(0, s.Length - 1).TrimEnd(); return (s.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase) || s.StartsWith("WITH", StringComparison.OrdinalIgnoreCase)) && !ForbiddenSql.IsMatch(s); }
        static string ReadBearer(HttpContext c) { var h = c.Request.Headers["Authorization"] ?? ""; return h.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? h.Substring(7).Trim() : ""; }
        static string ReadSecret() { var s = ConfigurationManager.AppSettings["BeraTokenSecret"]; if (string.IsNullOrWhiteSpace(s)) throw new ConfigurationErrorsException("BeraTokenSecret tanımlı değil."); return s.Trim(); }
        static string ConnectionString() { foreach (var n in new[] { "Logo", "LogoDb", "Tiger", "LOGO", "SqlServer" }) { var c = ConfigurationManager.ConnectionStrings[n]; if (c != null && !string.IsNullOrWhiteSpace(c.ConnectionString)) return c.ConnectionString; } throw new ConfigurationErrorsException("Logo SQL bağlantısı bulunamadı."); }
        static bool TryReadDates(HttpContext c, out DateTime start, out DateTime end) { start = end = DateTime.MinValue; string body; using (var r = new StreamReader(c.Request.InputStream, Encoding.UTF8)) body = r.ReadToEnd(); var p = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(body); if (p == null) return false; object a, b; return p.TryGetValue("startDate", out a) && p.TryGetValue("endDate", out b) && DateTime.TryParse(Convert.ToString(a, CultureInfo.InvariantCulture), CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out start) && DateTime.TryParse(Convert.ToString(b, CultureInfo.InvariantCulture), CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out end); }
        static List<Dictionary<string, object>> Execute(string sql, DateTime start, DateTime end, string group) { var rows = new List<Dictionary<string, object>>(); using (var cn = new SqlConnection(ConnectionString())) using (var cmd = new SqlCommand(sql, cn)) { cmd.CommandTimeout = 90; cmd.Parameters.AddWithValue("@BaslangicTarihi", start); cmd.Parameters.AddWithValue("@BitisTarihi", end); cmd.Parameters.AddWithValue("@StokGrupKodu", group); cn.Open(); using (var r = cmd.ExecuteReader()) { while (r.Read()) { if (rows.Count >= MaxRows) throw new InvalidOperationException("Rapor en fazla " + MaxRows + " satır olabilir. Tarih aralığını daraltın."); var row = new Dictionary<string, object>(); for (var i = 0; i < r.FieldCount; i++) row[r.GetName(i)] = r.IsDBNull(i) ? null : r.GetValue(i); rows.Add(row); } } } return rows; }
        static void AddCors(HttpContext c) { c.Response.Headers["Access-Control-Allow-Origin"] = "*"; c.Response.Headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"; c.Response.Headers["Access-Control-Allow-Headers"] = "Accept, Content-Type, Authorization"; }
        static void Fail(HttpContext c, int status, string message) { c.Response.StatusCode = status; c.Response.Write(new JavaScriptSerializer().Serialize(new Dictionary<string, object> { { "error", message } })); }
    }
}
