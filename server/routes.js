const path = require('path');

module.exports = server => {
	server.express.get('/', (_, response) => response.sendFile(path.join(server.paths.root, 'index.html')));

	server.express.get('/api', (_, response) => server.bible.getRandomVerse().then(verse => response.send({
		success: true,
		data: verse
	})).catch(error => response.status(500).send(error)));

	server.express.post('/api/game', (request, response) => {
		const testamentCode = Number(request.body.testament);
		if (!testamentCode || isNaN(testamentCode) || (testamentCode < 1 || testamentCode > 3)) return response.send({
			success: false,
			message: ['Invalid testament code', 'error']
		});

		const min = testamentCode === 2 ? 40 : 1;
		const max = testamentCode === 1 ? 39 : 66;
		
		return server.db.createGame(1, min, max).then(data => response.send({
			success: true,
			message: ['Starting new game...', 'success'],
			data: data
		})).catch(error => response.status(500).send({
			success: false,
			message: error
		}));
	});

	server.express.post('/api/game/:id/guess', (request, response) => {
		const book = Number(request.body.book);
		if (!book || isNaN(book) || (book < 1 || book > 66)) return response.send({
			success: false,
			message: ['Invalid book', 'error']
		});
		
		return server.db.guess(request.params.id, book)
			.then(result => response.send(result))
			.catch(error => response.status(500).send({
				success: false,
				message: error
			}));
	});
};