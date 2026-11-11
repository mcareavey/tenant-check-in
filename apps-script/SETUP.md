# Emailing check-ins with Google Apps Script

When a tenant presses Send, the form posts the PDF to this script. The script emails it to the landlord, then emails the tenant their own copy with the full details written out, both from the Google account that runs it.

Set it up in the Google account you want the emails to come from (a separate account just for this is a good idea).

## 1. Create the script

1. Signed in to that Google account, go to script.google.com and click **New project**.
2. Rename it (top left) to `Tenant check-in`.
3. Delete everything in `Code.gs`, paste in the contents of `Code.gs` from this folder, and change `LANDLORD_EMAIL` to the address that should receive check-ins.
4. Save (the disk icon).

## 2. Give it permission to send email

1. In the function menu at the top, choose `sendTestEmail` and click **Run**.
2. Google asks for permission. Click **Review permissions**, choose the account, then **Advanced** and **Go to Tenant check-in (unsafe)**, then **Allow**. The warning appears because the script is yours and Google hasn't reviewed it. It only asks to send email as you.
3. Check `LANDLORD_EMAIL` received the test email.

## 3. Publish it as a web app

1. Click **Deploy** then **New deployment**.
2. Click the cog next to "Select type" and choose **Web app**.
3. Set **Execute as** to `Me` and **Who has access** to `Anyone`.
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. Open that URL in a browser. You should see `"status":"running"`.

## 4. Connect the form

In `index.html`, set `SEND_URL` to the web app URL and push the change.

## Changing the script later

Edit the code, then **Deploy**, **Manage deployments**, the pencil icon, Version **New version**, **Deploy**. This keeps the same URL, so the form doesn't need changing.

## Limits

- Google allows a personal Gmail account to email 100 recipients a day, and 25 MB of attachments per message. Each check-in uses 2 recipients (landlord and tenant), so about 50 check-ins a day. The form keeps PDFs under 18 MB.
- Tenants' replies to their copy go to `TENANT_REPLY_TO` (the landlord's address by default).
- The script accepts at most 20 submissions an hour, so nobody can flood your inbox.
- The landlord's address only exists in the script, not in the public form.
