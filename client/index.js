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
		newTestament: true,
		oldTestament: true
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
		game: {
			playing: false,
			id: null,
			lives: null,
			books: [],
			verse: null
		},
		bookFilter: ''
	},
	computed: {
		filteredBooks: function(){
			const regex = new RegExp(this.bookFilter, 'i');
			return this.game.books.filter(book => regex.test(book.name));
		}
	},
	methods: {
		// Start a new game with the given testaments.
		startGame: function(testamentCode){
			return fetch('/api/game', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					testament: testamentCode
				})
			}).then(handleAPIResponse(this))
				.then(json => {
					if (!json.success) return;
					json.data.books.forEach(book => book.class = null);
					Object.assign(this.game, json.data, {
						playing: true,
						guessed: []
					});
					
					this.newGameMenu = false;
				}).catch(catchError(this));
		},
		// Clear the current game and return to the new game menu.
		clearGame: function(){
			this.newGameMenu = true;

			this.game = {
				playing: false,
				id: null,
				lives: null,
				books: [],
				verse: null
			};
		},
		// Stop the game and tell the user if they won.
		gameOver: function(won){
			this.message.value = won ? 'Congrats!' : 'There\'s always next time...';
			this.message.level = won ? 'success' : 'warn';
			this.game.playing = false;
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

		guess: function(position){
			if (!this.game.playing) return;
			if (this.game.guessed.includes(position)) return;

			return fetch('/api/game/' + this.game.id + '/guess', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					book: position
				})
			}).then(handleAPIResponse(this))
				.then(json => {
					if (!json.success) return;
					
					this.game.guessed.push(position);

					const { correct, lives, book } = json.data;

					this.game.lives = lives;

					const clickedBook = this.game.books.find(book => book.position === position);
					clickedBook.class = (correct ? 'right' : 'wrong') + '-book';

					if (correct) return this.gameOver(true);
					
					// If the player is still alive, return.
					if (!correct && !book) return;

					const actualBook = this.game.books.find(loopBook => loopBook.position === book);
					actualBook.class = 'actual-book';

					return this.gameOver(false);
				}).catch(catchError(this));
		}
	}
});


/**
 * Handle the response from an API endpoint.
 * 
 * @param {Object} app The main App.
 */
const handleAPIResponse = app => response => {
	if (!response.ok) return app.setMessage(response.status, 'error');

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