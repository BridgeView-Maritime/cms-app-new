import bcrypt from 'bcryptjs';

bcrypt.hash("Admin@123", 10).then(hash => {
    console.log("Use this exact string in HeidiSQL:");
    console.log(hash);
});