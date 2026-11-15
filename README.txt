ApnaSa Website — warm redesign

Run locally:
1. Extract the ZIP and open a terminal in the ApnaSa-Website folder.

2. Run: python3 -m http.server 8000
3. Open http://localhost:8000

Static HTML, CSS and JavaScript. No npm install needed.

Things to set before going live (top of app.js, CONFIG):
- whatsappNumber: the care team's WhatsApp number with country code, digits only (e.g. 919812345678).
  While empty, the floating "Baat karein?" button and WhatsApp buttons open the enquiry form.

The contact form still only creates a downloadable summary; it does not send enquiries.
Photos are in images/ — see PHOTO_CREDITS.txt
