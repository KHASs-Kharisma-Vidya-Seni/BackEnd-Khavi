CREATE TABLE users (
    uid SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100),
    photoURL VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    verificationToken VARCHAR(255),
    provider VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE forum (
    id_forum SERIAL PRIMARY KEY,
    id_user INT NOT NULL REFERENCES users(uid),
    content TEXT NOT NULL,
    image VARCHAR(255), 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tag (
    id_tag SERIAL PRIMARY KEY,
    tag_name VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE forum_tag (
    id_forum INT NOT NULL,
    id_tag INT NOT NULL,
    PRIMARY KEY (id_forum, id_tag),
    FOREIGN KEY (id_forum) REFERENCES forum(id_forum),
    FOREIGN KEY (id_tag) REFERENCES tag(id_tag)
);


CREATE TABLE comment (
    id_comment SERIAL PRIMARY KEY,
    id_forum INT NOT NULL REFERENCES forum(id_forum),
    id_user INT NOT NULL REFERENCES users(uid), -- ID pengguna yang membuat komentar
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


