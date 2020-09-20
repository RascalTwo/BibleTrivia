const fs = require('fs');
const xml2json = require('xml-to-json-promise');
const fetch = require('node-fetch');
const sqlite = require('sqlite');

const GIT_URL = ['https://raw.githubusercontent.com/dborza/bible-tools/master/bible-translations/', '.xml'];

const code = process.argv[2];
const name = process.argv[3];
const TRANSLATION_ID = Number(process.argv[4]);
if (!code || !name || !TRANSLATION_ID) {
	console.log('Invalid tranlsation code/name/id');
	process.exit(1);
}

function getAsJSON(code){
	return fetch(GIT_URL.join(code))
		.then(r => r.text())
		.then(xml => xml2json.xmlDataToJSON(xml));
}

function normalizeJSON(json){
	const books = {};
	for (const book of json.bible.book){
		const chapters = {};

		if (!Array.isArray(book.chapter)){
			book.chapter = [{
				$: {
					name: '1'
				},
				verse: book.chapter.verse
			}];
		}
		for (let c = 0; c < book.chapter.length; c++){
			const chapter = book.chapter[c];

			if (!chapters[chapter.$.name]) chapters[chapter.$.name] = {};

			for (let v = 0; v < chapter.verse.length; v++){
				const verse = chapter.verse[v];

				chapters[chapter.$.name][verse.$.name] = verse._;
			}
		}

		books[book.$.name] = {
			name: book.$.name,
			chapters
		};
	}

	return books;
}


async function insertJSON(json){
	const db = await sqlite.open('../../data/bible.db');

	await db.run('INSERT OR IGNORE INTO translation (code, name) VALUES (?, ?);', code, name);

	const bookInserts = [];
	const verseInserts = [];

	const books = Object.values(json);
	for (let p = 0; p < books.length; p++){
		const book = books[p];
		console.log(((p / books.length) * 100).toFixed() + ' ' + book.name);

		//await db.run('INSERT OR IGNORE INTO book VALUES (?, ?)', p + 1, book.name);
		bookInserts.push(`(${p + 1}, '${book.name}')`);

		const chapters = Object.keys(book.chapters).filter(n => !isNaN(Number(n)));
		for (const chapterNum of chapters){
			const chapter = book.chapters[chapterNum];

			const verses = Object.keys(chapter).filter(n => !isNaN(Number(n)));
			for (const verseNum of verses){
				const verse = chapter[verseNum];
				//await db.run('INSERT OR IGNORE INTO verse VALUES (?, ?, ?, ?, ?)', TRANSLATION_ID, p + 1, Number(chapterNum), Number(verseNum), verse);
				verseInserts.push(`(${TRANSLATION_ID}, ${p + 1}, ${Number(chapterNum)}, ${Number(verseNum)}, '${verse.replace(/'/g, '\\')}')`);
			}
		}
	}

	await db.exec('INSERT OR IGNORE INTO book VALUES ' + bookInserts.join(', '));
	await db.exec('INSERT OR IGNORE INTO verse VALUES ' + verseInserts.join(', '));
}

getAsJSON(code)
	.then(normalizeJSON)
	.then(insertJSON)
	.catch(console.error);