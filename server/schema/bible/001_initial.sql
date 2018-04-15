-- Up

CREATE TABLE 'verse' (
'translation' INTEGER NOT NULL  REFERENCES 'translation' ('id'),
'book' INTEGER NOT NULL  REFERENCES 'book' ('position'),
'chapter' INTEGER NOT NULL ,
'verse' INTEGER NOT NULL ,
'text' TEXT NOT NULL ,
UNIQUE (translation, book, chapter, verse, text)
);

CREATE TABLE 'translation' (
'id' INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
'code' TEXT NOT NULL ,
'name' TEXT NOT NULL 
);

CREATE TABLE 'book' (
'position' INTEGER NOT NULL  PRIMARY KEY,
'name' TEXT NOT NULL 
);

PRAGMA user_version = 1;

-- Down

DROP TABLE 'verse';

DROP TABLE 'translation';

DROP TABLE 'book';

PRAGMA user_version = 0;
