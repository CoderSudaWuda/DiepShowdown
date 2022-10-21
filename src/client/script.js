(() => {
    // -- MODIFY PROTOTYPEs -- //
    const { log: _log, warn: _warn, error: _error } = console;
    console.log = (...args) => _log(`%c[${new Date().toLocaleString()}] ${args.join(' ')}`, 'color: blue;');
    console.success = (...args) => _log(`%c[${new Date().toLocaleString()}] ${args.join(' ')}`, 'color: green;');
    console.error = (...args) => _error(`[${new Date().toLocaleString()}] ${args.join(' ')}`);
    console.warn = (...args) => _warn(`[${new Date().toLocaleString()}] ${args.join(' ')}`);

    // -- MANMADE FUNCTIONS -- //
    const sanitizeHTML = function(str) {
        var temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    const enumerate = function(object) {
        Object.entries(object).forEach(([k, v]) => object[v] = k);
        return object;
    };

    // -- CACHED INTERNAL FUNCTIONS -- //
    const { getElementById } = document;
    const { getItem, setItem, removeItem } = localStorage;

    class ElementManager {
        #views = enumerate({ 0: 'mainMenu', 1: 'allTeams', 2: 'teamBuild', 3: 'chooseTank', 4: 'tankBuild' });

        constructor(elements) {
            Object.entries(this.#views).forEach(([k, v]) => this.#views[k] = v);

            this.elements = {};

            this._view = 0;
            Object.defineProperty(this, 'view', {
                get() { return this._view; },
                set(v) { 
                    this.changeView(v);
                    this._view = v; 
                }
            });

            for (const info of elements) {
                if (typeof info === 'string') info = { name: info };

                const element = getElementById(info.name);
                if (!element) return console.error(`[ELEMENT]: Could not find element with ID ${info.name}.`);
                this.elements[info.name] = element;

                for (const [k, cb] of Object.entries(info)) {
                    if (typeof cb !== 'function') return;
                    this.#elements[info.name].addEventListener(k, cb.bind(this));
                }
            };
        }

        changeView(view) {
            this.#elements[this.#views[this.view]].style.display = 'none';
            this.#elements[this.#views[view]].style.display = 'block';
        }
    }

    class Player {
        constructor() {
            // -- ELEMENTS -- //
            this.elements = new ElementManager([
                // VIEW 0
                'mainMenu',
                'username',
                'password',
                'trainerID',
                'hoursPlayed',
                'joinDate',
                'playerAvatar',
                'elo',
                'globalChat',
                'chatBox',
                { name: 'changePassword' },
                { name: 'login' },
                { name: 'register', },
                { name: 'changePW '},
                { name: 'changeColor'},
                { name: 'picker' },
                { name: 'colorPicker' },
                { name: 'teamBuilder', click() { this.view++ } } // Teambuilder Button
            ]);

            // -- SOCKET -- //
            this.SERVER_URL = "ws://localhost:3000/";
            this.io = new WebSocket(this.SERVER_URL);
            this.io.binaryType = "arraybuffer";

            // -- PLAYER DATA -- //
            this.card = {};
            this.loggedIn = false;

            this.#attachEvents();
        }

        #attachEvents() {
            this.io.addEventListener("open", function() {
                console.success("[SOCKET]: Connected to server.");
            });

            this.io.addEventListener("error", er => console.error(`[SOCKET]: Error during connection has occured: ${er}.`));
            this.io.addEventListener("close", function() {
                console.log("[SOCKET]: Connection to server has been closed.");
                if (getItem('noOverlay')) return;

                this.elements.get('overlay').style.display = '';
                this.elements.get('modal').innerHTML = `
                <p style="color: red; font-size: 48px;">💀Disconnected💀</p>
                <p style="color: red; font-size: 24px;">The server may be down, you have no connection, or you went AFK.</p>
                `;
            });

            this.io.addEventListener("message", function({ data }) {
                _log(new Uint8Array(data));
                data = new Reader(new Uint8Array(data));

                switch (data.i8()) {
                    case 0x00: { return; } // ANTIBOT Packet, not in production.
                    case 0x01: { // ACCEPTED Packet, sent when the server accepts the client's login request.
                        this.card.trainerID = data.string();
                        this.card.hoursPlayed = data.f32();
                        this.card.joinDate = data.string();
                        this.card.playerAvatar = data.string();
                        this.card.elo = data.f32();
                        this.loggedIn = true;

                        const { chatBox, placeholder, picker, login } = this.elements;

                        chatBox.disabled = false;
                        chatBox.placeholder = 'Type a message...';
                        placeholder.style.display = 'none';
                        picker.style.display = 'none';
                        login.innerText = 'Log Out';

                        this.elements.usernameInfo.innnerText = `Username: ${getItem('username')}}`;
                        this.elements.trainerID.innerText = `Trainer ID: ${this.card.trainerID}`;
                        this.elements.hoursPlayed.innerText = `Hours Online: ${this.card.hoursPlayed}`;
                        this.elements.joinDate.innerText = `Join Date: ${this.card.joinDate}`;
                        this.elements.playerAvatar.src = `img/svgs/tanks.svg#${this.card.playerAvatar}`;
                        this.elements.elo.innerText = `ELO: ${this.card.elo}`;

                        return;
                    }
                    case 0x02: { // ERROR Packet, signifies when an error has occured.
                        return alert(data.string()); // Will make an error box later.
                    }
                    case 0x03: { // CHAT Packet, sent when a message is sent to the global chat.
                        const username = data.string();
                        const [r, g, b] = [data.i8(), data.i8(), data.i8()];
                        const content = data.string();

                        const { globalChat } = this.elements;
                        globalChat.innerHTML += `<div class="padding: 5px;"><b style="color: rgb(${r}, ${g}, ${b});">${sanitizeHTML(username)}:</b> ${sanitizeHTML(content)}</div>`;
                        globalChat.scrollTop = globalChat.scrollHeight;
                        return;                    
                    }
                    case 0x04: {

                    }
                }
            });
        }
    }
})();