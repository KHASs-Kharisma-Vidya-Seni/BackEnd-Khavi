CREATE TABLE Forum (
    id_forum INT PRIMARY KEY,
    content TEXT,
    image VARCHAR(255),
    id_user INT,
    id_tags INT,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES User(id_user),
    FOREIGN KEY (id_tags) REFERENCES Tags(id_tags)
);

CREATE TABLE Komentar (
    id_comment INT PRIMARY KEY,
    id_forum INT,
    id_user INT,
    comment_content TEXT,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_forum) REFERENCES Forum(id_forum),
    FOREIGN KEY (id_user) REFERENCES User(id_user)
);


CREATE TABLE User (
    uid INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255),
    photoURL VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    verified BOOLEAN DEFAULT false,
    verificationToken VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
