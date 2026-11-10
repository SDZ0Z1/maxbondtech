/**
 * Site configuration — edit these values before going live.
 * ---------------------------------------------------------------
 * Contact details also appear as plain text in the HTML pages.
 * Use your editor's "find & replace in all files" for:
 *   hello@maxbondtech.com
 *   +852 0000 0000   /   +85200000000
 *   Unit 0000, 00/F, Example Tower, Hong Kong
 */
window.MAXBOND_CONFIG = {
  company: 'Maxbond Technology',
  email: 'hello@maxbondtech.com',
  phone: '+852 0000 0000',
  phoneHref: '+85200000000',
  address: 'Unit 0000, 00/F, Example Tower, Hong Kong',
  hours: 'Mon–Fri, 9:30am – 6:30pm HKT',

  /**
   * Contact form
   * -------------------------------------------------------------
   * Leave `endpoint` empty and the form falls back to opening the
   * visitor's email app with a pre-filled message (mailto:).
   *
   * Web3Forms  (https://web3forms.com)
   *   endpoint: 'https://api.web3forms.com/submit',
   *   extraFields: { access_key: 'YOUR_ACCESS_KEY' }
   *
   * Formspree  (https://formspree.io)
   *   endpoint: 'https://formspree.io/f/YOUR_FORM_ID',
   *   extraFields: {}
   */
  form: {
    endpoint: '',
    extraFields: {},
    subject: 'New enquiry from maxbondtech.com',
  },
};
