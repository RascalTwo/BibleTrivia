const fs = require('fs');
const path = require('path');


/**
 * Get the ID of the current user.
 * 
 * @param {Object} request Request to get user from.
 * 
 * @returns {Number} ID of the user.
 */
const getUserId = request => {
	if (request.user) return request.user.id;
	return Number(request.sessionID);
};


/**
 * Handle an API rejection.
 * 
 * @param {Object} response Response to handle rejection with.
 * 
 * @returns {Function}
 */
const handleAPIRejection = response => error => {
	let text;

	if (error instanceof Error) text =  error.name + ':' + error.message + '\n' + error.stack;
	else if (Array.isArray(error) || typeof error === 'object') text = JSON.stringify(error, null, '');
	
	return response.status(500).send({
		success: false,
		message: [text, 'error']
	});
};


module.exports = server => {
	server.express.get('/', (_, response) => {
		const html = fs.readFileSync(path.join(server.paths.root, 'client', 'index.html')).toString();
		return server.bible.getTranslations().then(translations => {
			response.send(html.replace(/'={ PAYLOAD }='/g, JSON.stringify(translations)));
		}).catch(handleAPIRejection(response));
	});

	server.express.get('/api', (_, response) => server.bible.getRandomVerse().then(verse => response.send({
		success: true,
		data: verse
	})).catch(error => response.status(500).send(error)));

	server.express.post('/api/game', (request, response) => {
		const testamentCode = Number(request.body.testament);
		if (testamentCode === undefined || isNaN(testamentCode) || (testamentCode < 1 || testamentCode > 3)) return response.send({
			success: false,
			message: ['Invalid testament code', 'error']
		});

		const difficultyId = Number(request.body.difficulty);
		if (difficultyId === undefined || isNaN(difficultyId) || (difficultyId < 0 || difficultyId > 1)) return response.send({
			success: false,
			message: ['Invalid difficulty ID', 'error']
		});

		const translationId = Number(request.body.translation);
		if (translationId === undefined || isNaN(translationId) || translationId < 1) return response.send({
			success: false,
			message: ['Invalid translation ID', 'error']
		});

		return server.db.startGame(getUserId(request), translationId, testamentCode, difficultyId)
			.then(result => response.send(result))
			.catch(handleAPIRejection(response));
	});

	server.express.post('/api/game/:id/guess', (request, response) => {
		const book = Number(request.body.book);
		if (!book || isNaN(book) || (book < 1 || book > 66)) return response.send({
			success: false,
			message: ['Invalid book', 'error']
		});

		const chapter = Number(request.body.chapter);
		if (!isNaN(chapter) && (chapter < 1 || chapter > 117)) return response.send({
			success: false,
			message: ['Invalid chapter', 'error']
		});
		
		return server.db.makeGuess(getUserId(request), request.params.id, book, chapter)
			.then(result => response.send(result))
			.catch(handleAPIRejection(response));
	});
};