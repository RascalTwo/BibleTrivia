const path = require('path');

module.exports = server => {
	server.express.get('/', (_, response) => response.sendFile(path.join(server.paths.root, 'index.html')));

	server.express.get('/api', (_, response) => server.bible.getRandomVerse().then(verse => response.send({
		success: true,
		data: verse
	})).catch(error => response.status(500).send(error)));
};