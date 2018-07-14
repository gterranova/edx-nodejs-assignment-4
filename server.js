const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorhandler = require('errorhandler');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const ObjectId = mongoose.Types.ObjectId;

const opn = require('opn');

const defaultConfig = { 
    database: { default: { uri: "mongodb://localhost:27017/edx-course-db" } },
    api: { port: 3000 }
};

const userConfig = fs.existsSync(path.join(__dirname, 'config.json')) ? require('./config.json') : {};
const config = Object.assign({}, defaultConfig, userConfig);

const app = express();
app.use(bodyParser.json());
app.use(logger('dev'));
app.use(errorhandler());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(config.database.default.uri, { useNewUrlParser: true }, (err) => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
});

const Account = mongoose.model('Account', {
    name: { type: String, default: 'N/A' },
    balance: { type: Number, default: 0 }
});

app.get('/accounts', (req, res) => {
    return Account.find({}, (err, results) => {
        if (err) return res.status(500).send(err.message ? err.message : err);
        res.status(200).send(results);
    });
});

app.post('/accounts', (req, res) => {
    new Account(req.body).save((err, results) => {
        if (err) return res.status(500).send(err.message ? err.message : err);
        res.status(200).send(results);
    });
});

app.put('/accounts/:id', (req, res) => {
    let _id;
    try {
        _id = ObjectId(req.params.id);
    } catch (err) {
        return res.status(400).send(err.message ? err.message : err);
    }
    Account.findById({ _id }, (err, account) => {
        if (err) return res.status(500).send(err.message ? err.message : err);
        if (!account) return res.status(404).send();

        Object.assign(account, { 
            name: req.body.name || Account.schema.obj.name.default, 
            balance: parseInt(req.body.balance, 10) || Account.schema.obj.balance.default  
        });
        account.save( (err, account) => {
            res.status(200).send(account);
        });
    });
});

app.delete('/accounts/:id', (req, res) => {
    let _id;
    try {
        _id = ObjectId(req.params.id);
    } catch (err) {
        return res.status(400).send(err.message ? err.message : err);
    }
    // I prefer deleteOne() to remove() so I can check if any document
    // has actually been deleted 
    Account.deleteOne({ _id }, (err, results) => {
        if (err) return res.status(500).send(err.message ? err.message : err);
        if (results.n === 0) return res.status(404).send();
        res.sendStatus(204);
    });
});

if (require.main === module) {
    app.listen(config.api.port, function () {
        console.log(`Express server listening on localhost:${config.api.port}`);
        // Opens the url in the default browser 
        opn(`http://localhost:${config.api.port}`);
    })
} else {
    module.exports = app
}
