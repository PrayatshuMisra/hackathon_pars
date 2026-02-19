
-- 1. Cardiology Table
CREATE TABLE Cardiology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 2. Neurology Table
CREATE TABLE Neurology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 3. Gastroenterology Table
CREATE TABLE Gastroenterology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 4. Pulmonology Table
CREATE TABLE Pulmonology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 5. Orthopedics Table
CREATE TABLE Orthopedics (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 6. Emergency/Trauma Table
CREATE TABLE Emergency_Trauma (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 7. General Medicine Table
CREATE TABLE General_Medicine (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 8. Dermatology Table
CREATE TABLE Dermatology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 9. ENT Table
CREATE TABLE ENT (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 10. Urology/Nephrology Table
CREATE TABLE Urology_Nephrology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 11. Psychiatry Table
CREATE TABLE Psychiatry (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
 
-- 12. Toxicology Table
CREATE TABLE Toxicology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);
-- 13. Gynaecology Table
CREATE TABLE Gynaecology (
    doc_id SERIAL PRIMARY KEY,
    doc_name VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

-- SEED DATA

-- 1. Cardiology
INSERT INTO Cardiology (doc_name, experience_years, is_available) VALUES 
('Dr. Sarah Bennett', 15, TRUE),
('Dr. Raj Patel', 8, TRUE),
('Dr. Emily Chen', 22, FALSE),
('Dr. Michael Rossi', 12, TRUE),
('Dr. James O''Connor', 5, TRUE);

-- 2. Neurology
INSERT INTO Neurology (doc_name, experience_years, is_available) VALUES 
('Dr. Alan Turing', 20, TRUE),
('Dr. Lisa Kudrow', 10, FALSE),
('Dr. Sanjay Gupta', 14, TRUE),
('Dr. Rebecca Hall', 6, TRUE),
('Dr. David Kim', 18, TRUE);

-- 3. Gastroenterology
INSERT INTO Gastroenterology (doc_name, experience_years, is_available) VALUES 
('Dr. Hannah Lee', 9, TRUE),
('Dr. Mark Sloan', 25, TRUE),
('Dr. Derek Shepherd', 12, FALSE),
('Dr. Meredith Grey', 15, TRUE),
('Dr. Alex Karev', 10, TRUE);

-- 4. Pulmonology
INSERT INTO Pulmonology (doc_name, experience_years, is_available) VALUES 
('Dr. John Watson', 30, TRUE),
('Dr. Gregory House', 20, FALSE),
('Dr. Allison Cameron', 8, TRUE),
('Dr. Robert Chase', 11, TRUE),
('Dr. Eric Foreman', 13, TRUE);

-- 5. Orthopedics
INSERT INTO Orthopedics (doc_name, experience_years, is_available) VALUES 
('Dr. Callie Torres', 16, TRUE),
('Dr. Owen Hunt', 19, TRUE),
('Dr. Atticus Lincoln', 7, FALSE),
('Dr. Nico Kim', 5, TRUE),
('Dr. Eliza Minnick', 14, TRUE);

-- 6. Emergency/Trauma
INSERT INTO Emergency_Trauma (doc_name, experience_years, is_available) VALUES 
('Dr. April Kepner', 11, TRUE),
('Dr. Ethan Choi', 9, TRUE),
('Dr. Will Halstead', 8, FALSE),
('Dr. Natalie Manning', 10, TRUE),
('Dr. Connor Rhodes', 12, TRUE);

-- 7. General Medicine
INSERT INTO General_Medicine (doc_name, experience_years, is_available) VALUES 
('Dr. Miranda Bailey', 21, TRUE),
('Dr. Richard Webber', 35, TRUE),
('Dr. Levi Schmitt', 4, TRUE),
('Dr. Jo Wilson', 9, FALSE),
('Dr. Teddy Altman', 17, TRUE);

-- 8. Dermatology
INSERT INTO Dermatology (doc_name, experience_years, is_available) VALUES 
('Dr. Sandra Oh', 13, TRUE),
('Dr. Cristina Yang', 14, FALSE),
('Dr. Preston Burke', 22, TRUE),
('Dr. Addison Montgomery', 19, TRUE),
('Dr. Amelia Shepherd', 11, TRUE);

-- 9. ENT
INSERT INTO ENT (doc_name, experience_years, is_available) VALUES 
('Dr. Mark Green', 18, TRUE),
('Dr. Doug Ross', 16, TRUE),
('Dr. John Carter', 20, FALSE),
('Dr. Kerry Weaver', 25, TRUE),
('Dr. Luka Kovac', 15, TRUE);

-- 10. Urology/Nephrology
INSERT INTO Urology_Nephrology (doc_name, experience_years, is_available) VALUES 
('Dr. Catherine Fox', 28, TRUE),
('Dr. Jackson Avery', 14, TRUE),
('Dr. Ben Warren', 6, TRUE),
('Dr. Carina DeLuca', 10, FALSE),
('Dr. Andrew DeLuca', 8, TRUE);

-- 11. Psychiatry
INSERT INTO Psychiatry (doc_name, experience_years, is_available) VALUES 
('Dr. Jennifer Melfi', 24, TRUE),
('Dr. Frasier Crane', 20, TRUE),
('Dr. Niles Crane', 18, FALSE),
('Dr. Hannibal Lecter', 30, FALSE),
('Dr. Leo Marvin', 15, TRUE);

-- 12. Toxicology
INSERT INTO Toxicology (doc_name, experience_years, is_available) VALUES 
('Dr. Walter White', 12, TRUE),
('Dr. Sheldon Cooper', 10, TRUE),
('Dr. Leonard Hofstadter', 11, FALSE),
('Dr. Amy Fowler', 9, TRUE),
('Dr. Bernadette Rostenkowski', 8, TRUE);

--13. Gynaecology
INSERT INTO gynaecology (doc_name, experience_years, is_available) VALUES
('Dr. Margot Robbie', 15, TRUE),
('Dr. Emma Watson', 8, TRUE),
('Dr. Ryan Gosling', 22, TRUE),
('Dr. Anne Hathaway', 12, TRUE),
('Dr. Salma Hayek', 5, FALSE);
