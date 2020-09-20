/* global translations  */

// Display messages.
Vue.component('message-box', {
	props: ['value', 'level'],
	computed: {
		text: function(){
			if (this.value instanceof Error) return this.value.message;
			if (typeof this.value === 'string') return this.value.trim();
			if (typeof this.value === 'number') return this.value;
			return JSON.stringify(this.value, null, '  ');
		}
	},
	methods: {
		clearMessage: function(){
			this.$emit('clear-message');
		}
	},
	template: '#message-box-template'
});


// Handle creation of a new game.
Vue.component('start-menu', {
	data: () => ({
		translations,
		difficultyEasy: true,
		newTestament: true,
		oldTestament: true,
		translationValue: 1,
		disabled: false
	}),
	computed: {
		invalid: function(){
			return !this.newTestament && !this.oldTestament;
		},
		testamentCode: function(){
			// 1 = old, 2 = new, 3 = new and old.
			let code = 0;
			if (this.oldTestament) code += 1;
			if (this.newTestament) code += 2;
			return code;
		}
	},
	methods: {
		startGame: function(){
			this.disabled = true;
			return this.$emit('submitted', this.testamentCode, Number(!this.difficultyEasy), this.translationValue);
		}
	},
	template: '#start-menu-template'
});


// Display the number of lives
Vue.component('life-counter', {
	props: ['lives'],
	computed: {
		width: function(){
			return 100 - ((this.lives / 5) * 100) + '%';
		},
		info: function(){
			return this.lives + '/5 lives remaining';
		}
	},
	template: '#life-counter-template'
});


// Displays a verse
Vue.component('verse', {
	props: ['text', 'bcv', 'translation', 'bookMap'],
	computed: {
		loc: function(){
			if (!this.bcv) return false;
			const [bookPos, chapter, verse] =this.bcv.split('-').map(Number);
			return {
				book: this.bookMap[bookPos],
				chapter,
				verse
			};
		}
	},
	template: '#verse-template'
});


// The global App.
window.app = new Vue({
	el: '#vue-app',
	data: {
		newGameMenu: true,
		message: {
			value: null,
			level: null
		},
		referenceMenu: false,
		chapterSelector: {
			book: {},
			active: false,
			disabled: false,
			count: 0,
			chosen: null
		},
		bookList: {
			books: [],
			filter: '',
			clickable: true,
			filtered: []
		},
		game: {
			lives: null,
			rounds: [],
			currentRound: {
				verse_text: null,
				verse_bcv: null
			},
			previousRound: {
				verse_text: null,
				verse_bcv: null
			}
		}
	},
	watch: {
		'chapterSelector.chosen': function(newValue){
			if (!newValue) return;

			this.chapterSelector.disabled = true;

			const beforeLives = this.game.lives;
			this.guess(this.chapterSelector.book.position, newValue).then(correct => {
				if (!correct) {
					if (beforeLives - this.game.lives === 0.5){
						this.chapterSelector.book.class = 'wrong-chapter-book';
						this.chapterSelector.book.wrongChapters.push(Number(newValue));
					}
					else{
						this.chapterSelector.book.class = 'wrong-book';
					}
				}

				this.chapterSelector = {
					book: null,
					active: false,
					disabled: false,
					count: 0,
					chosen: null
				};
				this.bookList.clickable = true;
			});
		}
	},
	computed: {
		bookListFiltered: function(){
			const positionFilter = Number(this.bookList.filter);
			const regex = new RegExp(this.bookList.filter, 'i');
			return this.bookList.books.filter(book => regex.test(book.name) || book.position === positionFilter);
		},
		bookMap: function(){
			return this.bookList.books.reduce((map, book) => {
				map[book.position] = book;
				return map;
			}, {});
		}
	},
	methods: {
		closeReference: function(){
			this.referenceMenu = false;
		},
		// Start a new game with the given testaments.
		startGame: function(testamentCode, difficultyId, translationId){
			return fetch('/api/game', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					testament: testamentCode,
					difficulty: difficultyId,
					translation: translationId
				}),
				credentials: 'include'
			}).then(handleAPIResponse(this))
				.then(json => {
					if (!json.success) return;

					this.bookList.books = json.data.books.map(book => {
						book.class = null;
						book.wrongChapters = [];
						return book;
					});

					this.game = Object.assign({}, json.data.game, {
						playing: true,
						currentRound: json.data.game.rounds[json.data.game.rounds.length - 1],
						previousRound: json.data.game.rounds[json.data.game.rounds.length - 2]
					});
					
					this.newGameMenu = false;
				}).catch(catchError(this));
		},
		// Clear the current game and return to the new game menu.
		clearGame: function(){
			this.newGameMenu = true;
		},
		// Set the message content.
		setMessage: function(value, level){
			this.message = { value, level };
		},
		// Clear the currently-set message.
		clearMessage: function(){
			this.message.value = null;
			this.message.level = null;
		},
		chooseBook: function(bookPos){
			const clickedBook = this.bookList.books.find(book => book.position === bookPos);
			if (clickedBook.class === 'wrong-book' || clickedBook.class === 'right-book') return Promise.resolve(false);

			if (this.game.difficulty.id === 0) return this.guess(bookPos);

			clickedBook.class = 'active-book';
			
			this.chapterSelector.book = clickedBook;
			this.chapterSelector.count = clickedBook.chapterCount;
			this.chapterSelector.active = true;

			this.bookList.clickable = false;
		},
		guess: function(bookPos, chapterNum){
			if (!this.game.playing) return Promise.resolve(false);

			const clickedBook = this.bookList.books.find(book => book.position === bookPos);
			if (clickedBook.class !== null && clickedBook.class !== 'active-book') return Promise.resolve(false);

			return fetch('/api/game/' + this.game.id + '/guess', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					book: bookPos,
					chapter: chapterNum
				}),
				credentials: 'include'
			}).then(handleAPIResponse(this))
				.then(json => {
					if (!json.success) return false;

					const { correct, lives, bcv, round } = json.data;

					this.game.lives = lives;

					clickedBook.class = (correct ? 'right' : 'wrong') + '-book';

					if (!correct){
						if (!bcv) return false;
						const actualBookPos = Number(bcv.split('-')[0]);
					
						const actualBook = this.bookList.books.find(loopBook => loopBook.position === actualBookPos);
						actualBook.class = 'actual-book';
	
						this.game.playing = false;
						return false;
					}

					this.bookList.books.forEach(book => book.class !== 'right-book' ? book.class = null : undefined);
					
					this.bookList.filter = '';

					this.game.currentRound.verse_bcv = bcv;
					if (round){
						this.game.previousRound = Object.assign({}, this.game.currentRound);
						this.game.currentRound = round;
						this.game.rounds.push(round);
					}
					else{
						this.bookList.clickable = false;
					}

					this.referenceMenu = true;

					return true;
				}).catch(catchError(this));
		},
		closeChapterSelector: function(){
			this.chapterSelector.book.class = null;
			this.chapterSelector = {
				book: null,
				active: false,
				disabled: false,
				count: 0,
				chosen: null
			};
			this.bookList.clickable = true;
		}
	}
});


/**
 * Handle the response from an API endpoint.
 * 
 * @param {Object} app The main App.
 */
const handleAPIResponse = app => response => {
	if (!response.ok){
		const promise = response.headers.get('content-type').includes('application/json')
			? response.json()
			: response.text();
			
		return promise.then(result => {
			let error = typeof result === 'object' ? result.message[0] : response.statuc + '\n' + result;
			return Promise.reject(error);
		});
	}

	return response.json().then(json => {
		if (json.message) app.setMessage(...json.message);
		return json;
	});
};


/**
 * Catch any promise errors.
 * 
 * @param {Object} app The main App.
 */
const catchError = app => error => {
	app.setMessage(error, 'error');
};