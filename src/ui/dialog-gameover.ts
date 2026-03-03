

export async function gameOver() {
	let content = document.createDocumentFragment();

	let strong = document.createElement("strong");
	strong.textContent = "💀 GAME OVER";
	content.append(strong);
	alert(content);
}

