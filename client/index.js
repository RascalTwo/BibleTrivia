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
		difficultyEasy: true,
		newTestament: true,
		oldTestament: true,
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
			return this.$emit('submitted', this.testamentCode, Number(!this.difficultyEasy));
		}
	},
	template: '#start-menu-template'
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
		}
	},
	watch: {
		'chapterSelector.chosen': function(newValue){
			if (!newValue) return;

			this.chapterSelector.disabled = true;

			this.guess(this.chapterSelector.book.position, newValue).then(correct => {
				if (!correct) this.chapterSelector.book.class = null;
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
		}
	},
	methods: {
		// Start a new game with the given testaments.
		startGame: function(testamentCode, difficultyId){
			return fetch('/api/game', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					testament: testamentCode,
					difficulty: difficultyId
				}),
				credentials: 'include'
			}).then(handleAPIResponse(this))
				.then(json => {
					if (!json.success) return;

					this.bookList.books = json.data.books.map(book => {
						book.class = null;
						return book;
					});

					this.game = Object.assign(json.data.game, {
						playing: true,
						currentRound: json.data.game.rounds[json.data.game.rounds.length - 1]
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
			if (this.game.difficulty.id === 0) return this.guess(bookPos);

			if (this.chapterSelector.active){
				if (bookPos !== this.chapterSelector.book.position) return;
				this.chapterSelector.book.class = null;
				this.chapterSelector = {
					book: null,
					active: false,
					disabled: false,
					count: 0,
					chosen: null
				};
				this.bookList.clickable = true;
				return;
			}

			const clickedBook = this.bookList.books.find(book => book.position === bookPos);
			clickedBook.class = 'active-book';
			
			this.chapterSelector.book = clickedBook;
			this.chapterSelector.count = clickedBook.chapterCount;
			this.chapterSelector.active = true;

			this.bookList.clickable = false;
		},
		guess: function(bookPos, chapterNum){
			if (!this.game.playing) return Promise.resolve();

			const clickedBook = this.bookList.books.find(book => book.position === bookPos);
			if (clickedBook.class !== null && clickedBook.class !== 'active-book') return Promise.resolve();

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
						this.game.currentRound = round;
						this.game.rounds.push(round);
					}
					else{
						this.bookList.clickable = false;
					}
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