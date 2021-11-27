// блок глобальных переменных
let ws = new WebSocket("ws://localhost:8080/ws");
let input = document.getElementById("input");
let messages = document.getElementById("messages");
let start = document.getElementById("start");
let nick = document.getElementById("nick");
let chat = document.getElementById("chat");
let userList = document.getElementById("users");
let topName = document.getElementById("topName");
let exit = document.getElementById("exit");
let refresh = document.getElementById("refresh");
let login = document.getElementById("login");
let sender = null;

// структуры данных
let userMap = new Map();
let msgToSend = {
    nickName: null,
    body: null,
    highlight: [],
};

// __________________________События

// Личное сообщение
document.body.addEventListener("click", pickNick);

// отправка логина
start.addEventListener("click", function () {
    requestUsersOnline();
    start.style.backgroundColor = "#6c7ca1";
    setTimeout(() => {
        start.style.backgroundColor = "#2a334f";
    }, 100);

    topName.innerHTML = nick.value;

    // 1
    if (msgToSend.nickName == "" || msgToSend.nickName == null) {
        return;
    } else {
        ws.send(JSON.stringify(msgToSend));
        nick.value = null;

        // стилизация;
        topName.classList.add("loginFly");
        topName.style.visibility = "visible";
        exit.style.visibility = "visible";
        nick.style.visibility = "hidden";
        start.style.visibility = "hidden";

        setTimeout(() => {
            topName.classList.remove("loginFly");
            topName.classList.add("topName");
        }, 800);
    }
});

// обновление текущего онлайна
refresh.addEventListener("click", () => {
    requestUsersOnline();
    refresh.style.backgroundColor = "#6c7ca1";
    setTimeout(() => {
        refresh.style.backgroundColor = "#2a334f";
    }, 100);
    location.reload();
});

// закрытие соединение и обновление страницы
exit.addEventListener("click", () => {
    exit.style.backgroundColor = "#6c7ca1";
    setTimeout(() => {
        exit.style.backgroundColor = "#2a334f";
    }, 100);
    ws.close();
    userMap.clear();
    showUsers(userMap);
    location.reload();
});

// чтение ника при логине в объект сообщения
nick.addEventListener("change", function () {
    msgToSend.nickName = this.value;
});

// отправка тела сообщения
document.forms.publish.addEventListener("keydown", function (event) {
    if (event.code == "Enter" || event.code == "NumpadEnter") {
        event.preventDefault();
        // можно взять значение по textarea id
        msgToSend.body = this.input.value;
        ws.send(JSON.stringify(msgToSend));
        // можно по textarea name="message"
        this.message.value = "";
        msgToSend.body = null;
    }
});

// // фокусировка на поле отправки сообщения
// input.addEventListener("focus", (event) => {
//     event.preventDefault();
//     input.setAttribute("placeholder", "");
// });

// // потеря фокуса
// input.addEventListener("blur", (event) => {
//     event.preventDefault();
//     input.setAttribute("placeholder", "Написать сообщение...");
// });

// __________________________События WebSocket

// получение сообщение от сервера Web
ws.onopen = requestUsersOnline;

// прослушка входящих сообщений
ws.onmessage = function (event) {
    let incomingMessage = JSON.parse(event.data);
    console.log(incomingMessage);
    msgToSend.highlight = [];

    // без регистрации получение списка пользователей
    if ("userRequest" in incomingMessage) {
        addUsers(incomingMessage.userRequest);
    }

    // добавление пользователя
    if (incomingMessage.body == null) {
        addUsers(incomingMessage.nickName);
    }

    // если пришел массив, значит пользователь удален...
    if (Array.isArray(incomingMessage)) {
        if (userMap.size > incomingMessage.length) {
            // ... => надо удалить пользователя из списка
            deleteUser(incomingMessage);
        }
    }

    // пост сообщения в чат
    if (
        incomingMessage.nickName != null &&
        incomingMessage.body != "" &&
        incomingMessage.body != null
    ) {
        // подсветка индивидуальных сообщений
        if (incomingMessage.highlight.includes(msgToSend.nickName)) {
            showMessage(incomingMessage, incomingMessage.highlight);
            incomingMessage.highlight = [];
        } else {
            // иначе обычная отправка сообщения
            showMessage(incomingMessage);
        }
    }
};

// при закрытии соединения
ws.onclose = (event) => {
    console.log(`Connection closed with code ${event.code}`);
};

// __________________________Функции

// запрос логинов
function requestUsersOnline() {
    ws.send(
        JSON.stringify({
            usersList: "null",
        })
    );
}

// личное сообщение подствечивается
function pickNick(event) {
    let str = "";
    if (!event.target.classList.contains("nickInList")) {
        return;
    } else if (event.target.classList.contains("nickInList")) {
        str = event.target.textContent.slice(0, str.length - 1);
        input.focus();
        input.value += str + ", ";
        sender = str;
        msgToSend.highlight.push(str);
    }
}

// добавление пользователя
function addUsers(nick) {
    if (userMap.has(nick) || nick == undefined) {
        return;
    } else {
        userMap.set(nick, creatUserDiv(nick));
        showUsers(userMap);
    }
}

// удаление пользователя
function deleteUser(array) {
    userMap.forEach((value, key, map) => {
        if (!array.includes(key)) {
            map.delete(key);
            console.log("Deleted user: " + key);
        }
    });

    showUsers(userMap);
}

// отображение пользователей онлайн
function showUsers(map) {
    userList.innerHTML = "";
    map.forEach((value) => {
        userList.append(value);
    });

    // динамическое изменение высоты списка в зависимости от количества онлайн
    if (map.size > 1) {
        userList.style.height = map.size * getDivHeight(map) + 5 + "px";
    } else {
        userList.style.height = 30 + "px";
    }

    // расчет высоты контейнера
    function getDivHeight(map) {
        let divHeight = 0;
        map.forEach((value) => {
            divHeight = value.getBoundingClientRect().height;
        });
        return divHeight + 5;
    }
}

// создание div с имененем пользователя
function creatUserDiv(nick) {
    let nickConteiner = document.createElement("div");
    nickConteiner.innerHTML = `${nick}\n`;
    nickConteiner.classList.add("nickInList");
    return nickConteiner;
}

// показ сообщения в чате
function showMessage(message, highlight) {
    console.log(highlight);
    let msgConteiner = document.createElement("div");
    msgConteiner.classList.add("msgConteinerInChat");
    let userNameInChat = document.createElement("div");
    userNameInChat.classList.add("userNameInChat");
    let msgInChat = document.createElement("div");
    msgInChat.classList.add("msgInChat");

    // выделение сообщения отправленное конкретному адресату
    if (highlight) msgInChat.classList.add("highlight");

    userNameInChat.innerHTML = `${message.nickName}: `;
    msgInChat.innerHTML = `${message.body}\n`;
    msgConteiner.append(userNameInChat);
    msgConteiner.append(msgInChat);
    messages.append(msgConteiner);

    // скролл всегда внизу
    messages.scrollTop = messages.scrollHeight + 410;
}
