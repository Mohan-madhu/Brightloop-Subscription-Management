import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/brightloop_test?schema=public';

const { buildMimeMessage } = await import('../src/services/email.js');

test('MIME message contains alternative text, html and one encoded attachment', () => {
  const message = buildMimeMessage({
    from: 'Brightloop <billing@brightloop.test>',
    to: ['finance@example.test', 'customer@example.test'],
    subject: 'Quarterly report',
    text: 'Plain summary',
    html: '<p>HTML summary</p>',
    attachments: [{ filename: 'report.csv', contentType: 'text/csv', contentBase64: Buffer.from('a,b\r\n1,2', 'utf8').toString('base64') }]
  });
  assert.match(message, /^From: Brightloop <billing@brightloop\.test>/m);
  assert.match(message, /^To: finance@example\.test, customer@example\.test$/m);
  assert.match(message, /multipart\/alternative/);
  assert.match(message, /multipart\/mixed/);
  assert.match(message, /name="report\.csv"/);
  assert.match(message, /Content-Transfer-Encoding: base64/);
  const encoded = Buffer.from('a,b\r\n1,2', 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  assert.ok(message.includes(encoded));
  assert.ok(!message.includes(Buffer.from(encoded, 'utf8').toString('base64')));
});

test('headers cannot be injected and non-ASCII subjects are encoded', () => {
  const message = buildMimeMessage({
    from: 'billing@brightloop.test',
    to: 'finance@example.test',
    subject: 'Report\r\nBcc: attacker@example.test',
    text: 'Hello',
    html: '<p>Hello</p>'
  });
  assert.match(message, /^Subject: Report Bcc: attacker@example\.test$/m);
  assert.ok(!/^Bcc:/m.test(message));
  const unicode = buildMimeMessage({ from: 'a@b.test', to: 'c@d.test', subject: '₹ report', text: 'x', html: 'x' });
  assert.match(unicode, /^Subject: =\?UTF-8\?B\?/m);
});
