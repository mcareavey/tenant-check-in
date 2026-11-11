/**
 * Receives a check-in PDF from the tenant check-in form and emails it to the landlord.
 *
 * Set LANDLORD_EMAIL below, then deploy as a web app (see SETUP.md).
 * The recipient is fixed here on purpose: the form can't choose who gets emailed,
 * so the web app can't be used to send mail to anyone else.
 */

var LANDLORD_EMAIL = 'you@example.com';   // where completed check-ins are sent
var FROM_NAME = 'Tenant check-in form';
var MAX_PDF_BYTES = 20 * 1024 * 1024;     // Gmail allows 25 MB of attachments per message
var MAX_PER_HOUR = 20;                    // stops anyone flooding your inbox or the daily quota

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Hidden field that only bots fill in: pretend it worked and send nothing.
    if (data.botcheck) return reply({ ok: true });

    if (!underHourlyLimit()) return reply({ ok: false, error: 'busy' });

    if (typeof data.pdf !== 'string' || !data.pdf) return reply({ ok: false, error: 'no pdf' });
    var bytes = Utilities.base64Decode(data.pdf);
    if (bytes.length > MAX_PDF_BYTES) return reply({ ok: false, error: 'too big' });
    // A real PDF starts with "%PDF".
    if (bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70) return reply({ ok: false, error: 'not a pdf' });

    var name = clean(data.name, 80) || 'Tenant';
    var room = clean(data.room, 40);
    var tenantEmail = clean(data.email, 120);
    var filename = clean(data.filename, 120).replace(/[^\w .\-]/g, '') || 'Check-in.pdf';
    if (!/\.pdf$/i.test(filename)) filename += '.pdf';

    var message = {
      to: LANDLORD_EMAIL,
      subject: 'Check-in: ' + name + (room ? ', ' + room : ''),
      body: clean(data.summary, 8000) || 'Check-in form attached.',
      name: FROM_NAME,
      attachments: [Utilities.newBlob(bytes, 'application/pdf', filename)]
    };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail)) message.replyTo = tenantEmail;

    MailApp.sendEmail(message);
    return reply({ ok: true });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: 'server' });
  }
}

// Visiting the web app URL in a browser just confirms it's running.
function doGet() {
  return reply({ ok: true, status: 'running', emailsLeftToday: MailApp.getRemainingDailyQuota() });
}

function underHourlyLimit() {
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var count = Number(cache.get('sent_this_hour') || 0);
    if (count >= MAX_PER_HOUR) return false;
    cache.put('sent_this_hour', String(count + 1), 3600);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor to grant permission and send yourself a test email.
function sendTestEmail() {
  MailApp.sendEmail(LANDLORD_EMAIL, 'Check-in form: test email', 'If you can read this, the script can send email. Now deploy it as a web app.');
}
