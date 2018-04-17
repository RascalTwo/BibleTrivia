-- Up

CREATE TABLE 'game' (
'id' INTEGER NOT NULL  PRIMARY KEY AUTOINCREMENT,
'user_id' INTEGER NOT NULL ,
'translation_id' INTEGER NOT NULL ,
'testament_code' INTEGER NOT NULL ,
'difficulty_id' INTEGER NOT NULL  REFERENCES 'difficulty' ('id')
);

CREATE TABLE 'guess' (
'id' INTEGER NOT NULL  PRIMARY KEY AUTOINCREMENT,
'round_id' INTEGER NOT NULL  REFERENCES 'round' ('id'),
'book_pos' INTEGER NOT NULL ,
'chapter' INTEGER,
'when' INTEGER NOT NULL 
);

CREATE TABLE 'round' (
'id' INTEGER NOT NULL  PRIMARY KEY,
'game_id' INTEGER NOT NULL  REFERENCES 'game' ('id'),
'verse_bcv' TEXT NOT NULL ,
'picked' INTEGER NOT NULL 
);

CREATE TABLE 'user' (
'id' INTEGER NOT NULL  PRIMARY KEY AUTOINCREMENT,
'created' INTEGER NOT NULL ,
'name' INTEGER NOT NULL ,
'password' INTEGER NOT NULL 
);

CREATE TABLE 'difficulty' (
'id' INTEGER NOT NULL  PRIMARY KEY,
'name' TEXT NOT NULL 
);

INSERT INTO difficulty VALUES (0, 'Easy');
INSERT INTO difficulty VALUES (1, 'Hard');

PRAGMA user_version = 1;

-- Down

DROP TABLE 'game';

DROP TABLE 'guess';

DROP TABLE 'round';

DROP TABLE 'user';

DROP TABLE 'difficulty';

PRAGMA user_version = 0;
