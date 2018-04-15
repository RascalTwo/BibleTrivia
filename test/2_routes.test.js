const { expect } = require('chai');

const fetch = require('node-fetch');

const Server = require('../server.js')();

const server = new Server(5325);
const baseUrl = 'http://localhost:5325';

describe('routes', () => {
	before(() => server.init().then(() => server.start()));

	after(() => server.stop());

	it('returns HTML from main endpoint', () => fetch(baseUrl + '/').then(response => {
		expect(response.ok).to.equal(true);
		return response.text();
	}).then(html => {
		expect(html.startsWith('<!DOCTYPE html>')).to.equal(true);
	}));

	it('returns random verse from API', () => fetch(baseUrl + '/api').then(response => {
		expect(response.ok).to.equal(true);
		return response.json();
	}).then(json => {
		expect(json).to.be.a('object');
		expect(json.success).to.equal(true);

		const verse = json.data;
		expect(verse).to.be.a('object');
		expect(verse).to.have.property('translation', 1);
		expect(verse.text).to.be.a('string');
		expect(verse.book).to.be.at.least(1).and.at.most(66);
	}));
});