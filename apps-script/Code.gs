/**
 * Receives a check-in PDF from the tenant check-in form, emails it to the landlord,
 * then emails the tenant their own copy.
 *
 * Set LANDLORD_EMAIL below, then deploy as a web app (see SETUP.md).
 * The landlord always gets every submission, so any misuse of the tenant copy shows up
 * in the landlord's inbox. Each check-in uses 2 of the 100 daily email recipients.
 */

var LANDLORD_EMAIL = 'you@example.com';   // where completed check-ins are sent
var FROM_NAME = 'Tenant check-in form';
var TENANT_REPLY_TO = LANDLORD_EMAIL;     // where a tenant's reply to their copy goes; set to '' to leave replies in this account
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
    var validTenant = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail);
    if (validTenant) message.replyTo = tenantEmail;

    MailApp.sendEmail(message);

    // Tenant's own copy, sent only after the landlord's email has gone.
    var tenantCopy = false;
    if (validTenant && tenantEmail.toLowerCase() !== LANDLORD_EMAIL.toLowerCase()) {
      try {
        var first = name.split(/\s+/)[0];
        var copy = {
          to: tenantEmail,
          subject: 'Your check-in' + (room ? ': ' + room : ''),
          body: 'Hi ' + first + ',\n\n' +
            'Here is a copy of the check-in form you submitted. The full form, your signature and your photos are in the attached PDF.\n\n' +
            'Your landlord will countersign it and send you a signed copy. If you spot anything else in the first 7 days, ' +
            'email your landlord a description and photos and it becomes part of this record.\n\n' +
            '----------------------------------------\n\n' +
            (clean(data.details, 20000) || 'See the attached PDF.'),
          name: FROM_NAME,
          attachments: [Utilities.newBlob(bytes, 'application/pdf', filename)]
        };
        if (TENANT_REPLY_TO) copy.replyTo = TENANT_REPLY_TO;
        MailApp.sendEmail(copy);
        tenantCopy = true;
      } catch (copyErr) {
        console.error(copyErr);
      }
    }
    return reply({ ok: true, tenantCopy: tenantCopy });
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
