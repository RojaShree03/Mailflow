
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    emailSchema,
    passwordSchema,
    campaignSchema
} from './validation.js';

// Email validation tests
test('normalizes valid email addresses', () => {
    assert.equal(
        emailSchema.parse(' User@Example.com '),
        'user@example.com'
    );
});

test('rejects malformed email addresses', () => {
    assert.throws(() => emailSchema.parse('not-an-email'));
});

// Password validation tests
test('accepts a strong password', () => {
    assert.equal(
        passwordSchema.parse('MailFlow@2026'),
        'MailFlow@2026'
    );
});

test('rejects passwords shorter than 10 characters', () => {
    assert.throws(() => passwordSchema.parse('Abc@123'));
});

test('rejects passwords without uppercase letters', () => {
    assert.throws(() => passwordSchema.parse('mailflow@2026'));
});

test('rejects passwords without lowercase letters', () => {
    assert.throws(() => passwordSchema.parse('MAILFLOW@2026'));
});

test('rejects passwords without numbers', () => {
    assert.throws(() => passwordSchema.parse('MailFlow@Test'));
});

test('rejects passwords without special characters', () => {
    assert.throws(() => passwordSchema.parse('MailFlow2026'));
});

test('rejects passwords containing only whitespace as special characters', () => {
    assert.throws(() => passwordSchema.parse('MailFlow 2026'));
});

test('rejects passwords exceeding bcrypt byte limit', () => {
    assert.throws(() => passwordSchema.parse('A'.repeat(70) + '€@1'));
});

// Campaign validation tests
test('accepts a valid campaign payload', () => {
    assert.equal(
        campaignSchema.parse({
            campaignName: 'Test',
            subject: 'Hello',
            body: 'Hi',
            recipients: ['a@example.com']
        }).recipients.length,
        1
    );
});

test('rejects empty recipient lists', () => {
    assert.throws(() =>
        campaignSchema.parse({
            campaignName: 'Test',
            subject: 'Hello',
            body: 'Hi',
            recipients: []
        })
    );
});
