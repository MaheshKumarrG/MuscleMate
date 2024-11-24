const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Full name is required'
            },
            len: {
                args: [2, 50],
                msg: 'Full name must be between 2 and 50 characters'
            }
        }
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
            msg: 'This email is already registered'
        },
        validate: {
            notEmpty: {
                msg: 'Email is required'
            },
            isEmail: {
                msg: 'Please enter a valid email address'
            }
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Password is required'
            },
            len: {
                args: [6, 100],
                msg: 'Password must be at least 6 characters long'
            }
        }
    }
}, {
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                try {
                    user.password = await bcrypt.hash(user.password, 8);
                } catch (error) {
                    console.error('Error hashing password:', error);
                    throw new Error('Error processing password');
                }
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                try {
                    user.password = await bcrypt.hash(user.password, 8);
                } catch (error) {
                    console.error('Error hashing password:', error);
                    throw new Error('Error processing password');
                }
            }
        }
    }
});

// Instance method to validate password
User.prototype.validatePassword = async function(password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        console.error('Error validating password:', error);
        throw new Error('Error validating password');
    }
};

module.exports = User;
