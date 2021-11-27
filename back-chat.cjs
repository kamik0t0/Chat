const http = require("http");
const fs = require("fs");
const ws = require("ws");
const path = require("path");

// создание сервера на WebSocket который будет использоваться при запросе клиента
const wss = new ws.Server({ noServer: true });

const clients = new Map();
function accept(req, res) {
    // если WebSocket
    if (req.headers.upgrade) {
        // ручной запуск сервера на WebSocket
        wss.handleUpgrade(req, req.socket, Buffer.alloc(0), onSocketConnect);
        // статика
    } else if (req.url == "/") {
        fs.createReadStream("./chat.html").pipe(res);
    } else if (path.extname(req.url) == ".js") {
        let js = path.join(__dirname + req.url);
        fs.createReadStream(js).pipe(res);
    } else if (path.extname(req.url) == ".css") {
        let css = path.join(__dirname + req.url);
        fs.createReadStream(css).pipe(res);
    }
}
// принимает "веб-сокет" как параметр
function onSocketConnect(ws) {
    let keys = [];
    // "подписка" на входящие данные
    ws.on("message", function (message) {
        console.log(`New connection`);
        console.log(`Message received: ${message}`);

        // обработка входящего сообщения
        let object = JSON.parse(message);

        // если пришло сообщение от незарегистрированного пользователя
        if (object.nickName == null && object.body != null) {
            return;
        }

        // обработка запроса на список пользователей
        if ("usersList" in object) {
            clients.forEach((value, key) => {
                console.log("Online: " + key);
                ws.send(JSON.stringify({ userRequest: key }));
                value.send(JSON.stringify({ userRequest: key }));
            });
        }

        // регистрация пользователя
        if ("nickName" in object) {
            let nick = object.nickName;
            if (clients.has(nick)) {
                console.log(`User "${nick}" already connected`);
            } else {
                console.log(`User "${nick}" registered succesfuly!`);
                clients.set(nick, ws);
            }

            // отправка сообщения в чат всем клиентам
            for (let client of clients.values()) {
                client.send(JSON.stringify(object));
            }
        }
    });

    // удаление пользователя
    ws.on("close", function () {
        console.log(`Connection closed`);
        clients.forEach((value, key) => {
            if (value == ws) {
                clients.delete(key);
                console.log(`User "${key}" left chat`);
                if (clients.size == 0) {
                    console.log("NO USERS IN CHAT...");
                }
            }
        });

        // оставшиеся пользователи в чате
        clients.forEach((value, key, map) => {
            console.log("Current online: " + key);
            keys.push(`${key}`);
        });

        clients.forEach((value) => {
            value.send(JSON.stringify(keys));
        });
    });
}

// создание http соединения для статики
http.createServer(accept).listen(8080);
