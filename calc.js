const random_box_bonuses = [
	{
	 "chance": 1,
	 "name": "Found Coins",
	 "toggleable": false
	},
	{
	 "chance": .30,
	 "name": "Frenzy",
	 "toggleable": false
	},
	{
	 "chance": .04,
	 "name": "Equipment Bonus",
	 "toggleable": false
	},
	{
	 "chance": .01,
	 "name": "OMG",
	 "toggleable": false
	},
	{
	 "chance": .05,
	 "name": "Coin Value",
	 "toggleable": false
	},
	{
	 "chance": .10,
	 "name": "Dual Randomness",
	 "toggleable": true
	},
	{
	 "chance": .12,
	 "name": "Gemstone Rush",
	 "toggleable": true
	},
	{
	 "chance": .20,
	 "name": "CpS Multiplier",
	 "toggleable": false
	},
	{
	 "chance": .25,
	 "name": "Horde",
	 "toggleable": true
	},
	{
	 "chance": .12,
	 "name": "Increase Souls",
	 "toggleable": true
	}
]
//map from bonus name to toggled state, if toggleable
const toggled = random_box_bonuses.filter(b => b.toggleable).reduce((accumulator, curr) => { accumulator[curr.name] = false; return accumulator;}, {});
const createCheckbox = (bonus) => {
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.name = bonus.name;
	checkbox.classList.add("bonus_checkbox");
	checkbox.addEventListener("change", onBonusToggle);
	const label = document.createElement("label");
	label.textContent = bonus.name;
	if(bonus.name === "Horde"){
		label.textContent = "Map has flying enemies";	
	}
	label.htmlFor = bonus.name;
	const container = document.createElement("div");
	container.appendChild(label);
	container.appendChild(checkbox);
	return container;
};

/** @type {Record<string, HTMLTableCellElement>} map of bonus name to its result cell */
const result_cells = {};

/**
 * Called on a bonus's checkbox being changed
 * @param {MouseEvent<HTMLInputElement>} event
 */
const onBonusToggle = (event) => {
	const bonus_name = event.currentTarget.name;
	if (toggled[bonus_name] === undefined) {
		toggled[bonus_name] = true;
	}
	else {
		toggled[bonus_name] = !toggled[bonus_name];
	}
	runSimulation();
}

document.addEventListener("DOMContentLoaded", () => {
	//enumerate options
	const options_area = document.getElementById("optionsArea");
	const results_table = document.getElementById("resultsTable");
	for (const bonus of random_box_bonuses) {
		if (bonus.toggleable) {
			options_area.appendChild(createCheckbox(bonus));
		}
		const result_cell = document.createElement("td");
		result_cells[bonus.name] = result_cell;
		const bonus_row = document.createElement("tr");
		const name_cell = document.createElement("td");
		name_cell.textContent = bonus.name;
		bonus_row.appendChild(name_cell);
		bonus_row.appendChild(result_cell);
		results_table.appendChild(bonus_row);
	}
	runSimulation();
});

const sortTable = () => {
	const table = document.getElementById("resultsTable");
	const store = [];
	for (let i = 0, len = table.rows.length; i < len; i++) {
		const row = table.rows[i];
		const sort_value = parseFloat(row.cells[1].textContent);
		store.push([sort_value, row]);
	}
	store.sort((a, b) => b[0]-a[0]);
	for (const [_, row] of store) {
		table.appendChild(row);
	}
};
/**
 * Run the simulation. Chooses a random bonus `num_rounds` times and then puts the results in the table
 */
const runSimulation = () => {
    let num_success = {};
    for (const random_bonus of random_box_bonuses) {
        num_success[random_bonus.name] = 0;
    }
    const num_rounds = 100000;
    for (let run = 0; run < num_rounds; run++) {
        num_success[selectRandomBonus().name]++;
    }
    for (const key of Object.keys(num_success)) {
		result_cells[key].textContent = `${(num_success[key] / num_rounds * 100).toFixed(2)}%`;
	}
	sortTable();
};
/**
 * Shuffle the array in place, to pick from later
 * @param {Array<T>} array Array to shuffle
 */
const shuffleArray = (array) => {
    var currentIndex = array.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
};
/**
 * Selects a random bonus according to the algorithm described by plab
 * Shuffles the array, and then goes down the list, attempting to choose each event
 * An event passes if it is toggled and if its chances pass
 */
const selectRandomBonus = () => {
    let evt = null;
    do {
        shuffleArray(random_box_bonuses);
		for (const random_bonus of random_box_bonuses) {
			let chance = Math.random();
			if (chance <= random_bonus.chance) {
				evt = random_bonus;
			}
		}
    } while (evt !== null && toggled[evt.name] !== undefined && !toggled[evt.name]);
    return evt;
};