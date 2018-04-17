const { expect } = require('chai');

const fetch = require('node-fetch');

const Server = require('../server.js');

const server = new Server(5325, {}, true);
const baseUrl = 'http://localhost:5325';

const fetchPOST = (path, data, headers) => fetch(baseUrl + path, {
	method: 'POST',
	headers: Object.assign({}, headers, {
		'content-type': 'application/json'
	}),
	body: JSON.stringify(data),
	credentials: 'include'
});

describe('routes', () => {
	before(() => server.init().then(() => server.start()));

	after(done => {
		server.stop().then(done);
	});
	
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

		it('requires difficulty paramater', () => fetchPOST('/api/game', {
			testament: 1
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('Invalid difficulty ID');
		}));

		it('creates and returns game instance', () => fetchPOST('/api/game', {
			testament: 3,
			difficulty: 0
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);

			const { game, books } = json.data;

			expect(game).to.be.a('object');
			expect(game).to.have.property('id').that.is.a('number');
			expect(game).to.have.property('translation_id').that.equals(1);
			expect(game).to.have.property('testament_code').that.equals(3);
			
			expect(game).to.have.property('difficulty').that.deep.equals({
				id: 0,
				name: 'Easy'
			});

			expect(game).to.have.property('user').that.is.a('object').and.that.has.property('isSession').that.equals(true);
			expect(game.user.id).to.be.a('number');
			
			expect(game).to.have.property('lives').that.is.a('number');
			
			expect(game).to.have.property('rounds').that.is.a('array').that.has.lengthOf(1);

			const round = game.rounds[0];

			expect(round).to.have.property('id').that.is.a('number');
			expect(round).to.have.property('game_id').that.equals(game.id);
			expect(round).to.have.property('picked').that.is.a('number');
			expect(round).to.have.property('verse_text').that.is.a('string');

			expect(books).to.be.a('array');

			expect(books.length).to.equal(66);
		}));
		
		it('old testament', () => fetchPOST('/api/game', {
			testament: 1,
			difficulty: 0
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);
			expect(json.data.books.length).to.equal(39);
		}));
		
		it('new testament', () => fetchPOST('/api/game', {
			testament: 2,
			difficulty: 0
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);
			expect(json.data.books.length).to.equal(27);
		}));
	});
	
	describe('/api/game/:id/guess', () => {
		let game;
		let headers;
		beforeEach(() => {
			return fetchPOST('/api/game', {
				testament: 3,
				difficulty: 0
			}).then(response => {
				headers = {
					cookie: response.headers.get('set-cookie')
				};
				return response.json();
			}).then(json => server.db.getGame(json.data.game.id, false))
				.then(result => game = result.data.game);
		});

		it('requires book paramater', () => fetchPOST('/api/game/' + game.id + '/guess').then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('Invalid book');
		}));

		it('can only be guessed by player', () => fetchPOST('/api/game/' + game.id + '/guess', {
			book: 1
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('You are not the player of this game');
		}));

		it('handles non-existant games', () => fetchPOST('/api/game/9000/guess', {
			book: 1
		}).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(false);

			expect(json.message[0]).to.equal('Game not found');
		}));

		it('returns success on correct guess', () => fetchPOST('/api/game/' + game.id + '/guess', {
			book: Number(game.rounds[0].verse_bcv.split('-')[0])
		}, headers).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);

			const { correct, lives, guess, round } = json.data;

			expect(correct).to.equal(true);
			expect(lives).to.equal(5);

			expect(guess).to.be.a('object');
			expect(guess).to.have.property('id').that.is.a('number');
			expect(guess).to.have.property('round').that.equals(round.id - 1);
			expect(guess).to.have.property('book_pos').that.is.a('number');
			expect(guess).to.have.property('chapter').that.equals(null);
			expect(guess).to.have.property('when').that.is.a('number');

			expect(round).to.be.a('object');
			expect(round).to.have.property('id').that.is.a('number');
			expect(round).to.have.property('game_id').that.equals(game.id);
			expect(round).to.not.have.property('verse_bcv');
			expect(round).to.have.property('verse_text').that.is.a('string');
			expect(round).to.have.property('picked').that.is.a('number');
		}));

		it('decrements lives on incorrect book', () => fetchPOST('/api/game/' + game.id + '/guess', {
			book: ((Number(game.rounds[0].verse_bcv.split('-')[0]) + 1) % 66) + 1
		}, headers).then(response => {
			expect(response.ok).to.equal(true);
			return response.json();
		}).then(json => {
			expect(json).to.be.a('object');
			expect(json.success).to.equal(true);

			const { correct, lives } = json.data;

			expect(correct).to.equal(false);
			expect(lives).to.equal(4);

			return fetchPOST('/api/game/' + game.id + '/guess', {
				book: ((Number(game.rounds[0].verse_bcv.split('-')[0]) + 1) % 66) + 1
			}, headers);
		}).then(response =>  response.json()).then(json => expect(json.data.lives).to.equal(3)));

		describe('Hard Difficulty', () => {
			let game;
			let headers;
			beforeEach(() => {
				return fetchPOST('/api/game', {
					testament: 3,
					difficulty: 1
				}).then(response => {
					headers = {
						cookie: response.headers.get('set-cookie')
					};
					return response.json();
				}).then(json => server.db.getGame(json.data.game.id, false))
					.then(result => game = result.data.game);
			});

			it('decrements half-lives on incorrect chapter', () => {
				const [book, chapter] = game.rounds[0].verse_bcv.split('-').map(Number);

				return fetchPOST('/api/game/' + game.id + '/guess', {
					book,
					chapter: chapter + 1
				}, headers).then(response => {
					expect(response.ok).to.equal(true);
					return response.json();
				}).then(json => {
					expect(json).to.be.a('object');
					expect(json.success).to.equal(true);
	
					const { correct, lives } = json.data;
	
					expect(correct).to.equal(false);
					expect(lives).to.equal(4.5);
	
					return fetchPOST('/api/game/' + game.id + '/guess', {
						book,
						chapter: chapter + 1
					}, headers);
				}).then(response =>  response.json()).then(json => expect(json.data.lives).to.equal(4));
			});
		});

		const makeGuesses = (gameId, times, book, chapter) => {
			return new Array(times).fill(null).reduce((promise, _, i) => promise.then(() => fetchPOST('/api/game/' + gameId + '/guess', {
				book,
				chapter
			}, headers).then(response => {
				expect(response.ok).to.equal(true);
				return response.json();
			}).then(json => {
				expect(json).to.be.a('object');
				const expectedLives = 5 - (i + 1);
				expect(json.data.lives).to.equal(expectedLives >= 0 ? expectedLives : 0);

				return json;
			})), Promise.resolve([]));
		};

		it('returns correct book when out of lives', () => makeGuesses(game.id, 4, ((Number(game.rounds[0].verse_bcv.split('-')[0]) + 1) % 66) + 1));
	
		it('prevents guessing on game with no lives', () => makeGuesses(game.id, 6, ((Number(game.rounds[0].verse_bcv.split('-')[0]) + 1) % 66) + 1)
			.then(json => {
				expect(json.success).to.equal(false);
				expect(json.message[0]).to.equal('Game has already been lost');
				expect(json.data.bcv).to.equal(game.rounds[0].verse_bcv);
			}));

		it('returns ending result on guesses when out of lives', () => makeGuesses(game.id, 5, ((Number(game.rounds[0].verse_bcv.split('-')[0]) + 1) % 66) + 1)
			.then(json => {
				expect(json.data.correct).to.equal(false);
				expect(json.data.bcv).to.equal(game.rounds[0].verse_bcv);
			}));
	
		it('can be won', async () => {
			const gameResponse = await fetchPOST('/api/game', {
				testament: 2,
				difficulty: 0
			});
			
			const headers = {
				cookie: gameResponse.headers.get('set-cookie')
			};

			const gameId = await gameResponse.json().then(json => json.data.game.id);

			let { game, books } = (await server.db.getGame(gameId, true)).data;
			
			let json;
			for (var i = 0; i < books.length; i++){
				const book = Number(game.rounds[game.rounds.length - 1].verse_bcv.split('-')[0]);
				json = await fetchPOST('/api/game/' + game.id + '/guess', { book }, headers).then(r => r.json());
				game = (await server.db.getGame(gameId, false)).data.game;
			}

			expect(json.message[0]).to.equal('You won in 0 minutes');
		}).timeout(5000);
	});
});