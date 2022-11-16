/*
Hooks.on("init", async () => {
	game.settings.register("multi-roll", "hideNPCs", {
		scope: "world",
		config: true,
		name: "Hide non-Player Token Targets",
		hint: "Hides not owned by players tokens from the target list of a damage roll.",
		type: Boolean,
		default: false
	});
});
*/

const KEY = 'speaking-as';
const NAME = "Speaking As";
const CSS_PREFIX = `${KEY}--`;

const _log = (logFN, ...args) => {
	logFN.apply(console, [`%c${NAME}`, 'background-color: #4f0104; color: #fff; padding: 0.1em 0.5em;', ...args]);
};

const log = {
	dir: (label, ...args) => {
		const group = `${NAME} | ${label}`;
		console.group(group);
		console.dir(...args);
		console.groupEnd(group);
	},
	debug: (...args) => {
		_log(console.debug, ...args);
	},
	info: (...args) => {
		_log(console.info, ...args);
	},
	error: (...args) => {
		_log(console.error, ...args);
	},
};

function getThisSceneTokenObj(speaker) {
	let token = getTokenObj(speaker.token);
	if (!token) {
		token = getThisSceneTokenObjForActor(speaker.actor);
	}
	return token;
}

function getThisSceneTokenObjForActor(actorID) {
	let token = null;
	const scene = game.scenes.get(game.user.viewedScene);
	if (scene) {
		const thisSceneToken = scene.tokens.find((token) => {
			return token.actor && token.actor.id === actorID;
		});
		if (thisSceneToken) {
			token = getTokenObj(thisSceneToken.id);
		}
	}
	return token;
}

function getTokenObj(id) {
	if (!canvas.ready) {
		log.info(`getTokenObj(${id}) bailed - canvas is not ready yet`);
		return undefined;
	}
	return canvas.tokens.get(id);
}

let lastHoveredToken = null;
const hoverIn = (event, speaker) => {
	let token = getThisSceneTokenObj(speaker);
	if (token && token.isVisible) {
		event.fromChat = true;
		token._onHoverIn(event);
		lastHoveredToken = token;
	}
};

const hoverOut = (event) => {
	if (lastHoveredToken && lastHoveredToken._hover) {
		event.fromChat = true;
		lastHoveredToken._onHoverOut(event);
		lastHoveredToken = null;
	}
};

const panToSpeaker = (speaker) => {
	panToToken(getThisSceneTokenObj(speaker));
};

const panToToken = (token) => {
	if (token && token.isVisible) {
		const scale = Math.max(1, canvas.stage.scale.x);
		canvas.animatePan({ ...token.center, scale, duration: 1000 });
	}
}

const hasTokenOnSheet = (actor) => {
	return !!getThisSceneTokenObjForActor(actor.id);
}

const selectActorToken = (actor) => {
	let token = getThisSceneTokenObjForActor(actor.id);
	token.control();
	panToToken(token);
};

const CSS_CURRENT_SPEAKER = CSS_PREFIX + 'currentSpeaker';

const currentSpeakerDisplay = document.createElement('div');
currentSpeakerDisplay.classList.add(CSS_CURRENT_SPEAKER);

function updateSpeaker() {
	currentSpeakerDisplay.classList.add('hide');
	setTimeout(() => {
		const tokenDocument = fromUuidSync(`Scene.${ChatMessage.getSpeaker().scene}.Token.${ChatMessage.getSpeaker().token}`)
		if (tokenDocument) {
			currentSpeakerDisplay.innerHTML = `<img src="${tokenDocument.texture.src}" class="speaking-as--currentSpeaker--icon" style="scale: ${tokenDocument.texture.scaleX}">`
		} else {
			currentSpeakerDisplay.innerHTML = `<img src="${game.user.avatar}" class="speaking-as--currentSpeaker--icon">`
		}
		currentSpeakerDisplay.innerHTML += `<span class="${CSS_CURRENT_SPEAKER}--text">${ChatMessage.getSpeaker().alias}</span>`
	}, 250)
	setTimeout(() => {
		currentSpeakerDisplay.classList.remove('hide');
	}, 250)
}

Hooks.once('renderChatLog', () => {
	const chatControls = document.getElementById('chat-controls');
	// "be last" magic trick from Supe
	setTimeout(async () => {
		chatControls.parentNode.insertBefore(currentSpeakerDisplay, chatControls);
	}, 0);

	const currentSpeakerToggleMenu = new ContextMenu(
		$(chatControls.parentNode),
		'.' + CSS_CURRENT_SPEAKER,
		[]
	);
	const originalRender = currentSpeakerToggleMenu.render.bind(currentSpeakerToggleMenu);
	currentSpeakerToggleMenu.render = (...args) => {
		const actors = game.actors.contents.filter(
			(a) => a.isOwner && hasTokenOnSheet(a)
		);
		const speakerOptions = [];
		for (let actor of actors) {
			console.log(actor.prototypeToken.texture.src)
			speakerOptions.push({
				name: actor.name,
				icon: "",
				callback: () => {
					selectActorToken(actor);
				},
			});
		}
		currentSpeakerToggleMenu.menuItems = speakerOptions;
		originalRender(...args);
	};


	updateSpeaker();

	const csd = $(currentSpeakerDisplay);
	csd.hover((event) => {
		hoverIn(event, ChatMessage.getSpeaker());
	}, hoverOut);
	csd.dblclick((event) => panToSpeaker(ChatMessage.getSpeaker()));

	// Remove Illandril's Chat Enhancements display
	document.getElementsByClassName('illandril-chat-enhancements--currentSpeaker')[0].remove();
});

Hooks.on('controlToken', updateSpeaker);