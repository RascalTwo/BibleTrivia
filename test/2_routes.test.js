const { expect } = require('chai');

const fetch = require('node-fetch');

const Server = require('../server.js');

const server = new Server(5325);
const baseUrl = 'http://localhost:5325';

const fetchPOST = (path, data) => fetch(baseUrl + path, {
	method: 'POST',
	headers: {
		'content-type': 'application/json'
	},
	body: JSON.stringify(data)
});

describe('routes', () => {
	before(() => server.init().then(() => server.start()));

	after(() => server.stop());

	describe('/', () => {
		it('returns HTML from main endpoint', () => fetch(baseUrl + '/').then(response => {
			expect(response.ok).to.equal(true);
			return response.text();
		}).then(html => {
			expect(html.startsWith('<!DOCTYPE html>')).to.equal(true);
		}));
	});

	describe('/api', () => {
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

	describe('/api/game', () => {
		it('requires testament paramater', () => fetchPOST('/api/game').then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('Invalid testament code');
		}));

		it('creates and returns game instance', () => fetchPOST('/api/game', {
			testament: 3
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);

			const game = json.data;
			expect(game).to.be.a('object');
			expect(game).to.have.property('id').that.is.a('number');
			expect(game).to.have.property('lives').that.is.a('number');
			expect(game).to.have.property('books').that.is.a('array');
			expect(game).to.have.property('verse').that.is.a('string');

			expect(game.books.length).to.equal(66);
			
			const dbGame = server.db.games[server.db.latestGameId - 1];
			expect(dbGame).to.be.a('object');
			expect(game.id).to.equal(dbGame.id);
			expect(game.verse).to.equal(dbGame.verse.text);
		}));
		
		it('old testament', () => fetchPOST('/api/game', {
			testament: 1
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);
			expect(json.data.books.length).to.equal(39);

			const dbGame = server.db.games[server.db.latestGameId - 1];
			expect(dbGame.verse.book).to.be.greaterThan(0).and.lessThan(40);
		}));
		
		it('new testament', () => fetchPOST('/api/game', {
			testament: 2
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);
			expect(json.data.books.length).to.equal(27);

			const dbGame = server.db.games[server.db.latestGameId - 1];
			expect(dbGame.verse.book).to.be.greaterThan(39).and.lessThan(70);
		}));
	});

	describe('/api/game/:id/guess', () => {
		let game;
		beforeEach(() => {
			return fetchPOST('/api/game', {
				testament: 3
			}).then(response =>  response.json()).then(json => {
				game = server.db.games[json.data.id];
			});
		});

		it('requires book paramater', () => fetchPOST('/api/game/' + game.id + '/guess').then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('Invalid book');
		}));

		it('handles non-existant games', () => fetchPOST('/api/game/9000/guess', {
			book: game.verse.book
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('Game not found');
		}));

		it('returns success on correct guess', () => fetchPOST('/api/game/' + game.id + '/guess', {
			book: game.verse.book
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);

			const { correct, lives, book } = json.data;

			expect(correct).to.equal(true);
			expect(lives).to.equal(5);
			expect(book).to.be.undefined;
		}));

		it('decrements lives on failed guess', () => fetchPOST('/api/game/' + game.id + '/guess', {
			book: ((game.verse.book + 1) % 66) + 1
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);

			const { correct, lives, book } = json.data;

			expect(correct).to.equal(false);
			expect(lives).to.equal(4);
			expect(book).to.be.undefined;

			return fetchPOST('/api/game/' + game.id + '/guess', {
				book: ((game.verse.book + 1) % 66) + 1
			});
		}).then(response =>  response.json()).then(json => {
			expect(json.data.lives).to.equal(3);
		}));

		it('returns correct book when out of lives', () => {
			game.lives = 1;
			return fetchPOST('/api/game/' + game.id + '/guess', {
				book: ((game.verse.book + 1) % 66) + 1
			}).then(response => {
				expect(response.ok).to.equal(true);
				return response.json();
			}).then(json => {
				expect(json).to.be.a('object');
				expect(json.success).to.equal(true);
	
				const { correct, lives, book } = json.data;
	
				expect(correct).to.equal(false);
				expect(lives).to.equal(0);
				expect(book).to.equal(game.verse.book);
			});
		});
	
		it('returns ending result on guesses when out of lives', () => {
			game.lives = 0;
			return fetchPOST('/api/game/' + game.id + '/guess', {
				book: game.verse.book
			}).then(response => {
				expect(response.ok).to.equal(true);
				return response.json();
			}).then(json => {
				expect(json).to.be.a('object');
				expect(json.success).to.equal(true);
	
				const { correct, lives, book } = json.data;
	
				expect(correct).to.equal(false);
				expect(lives).to.equal(0);
				expect(book).to.equal(game.verse.book);
			});
		});
	});
});