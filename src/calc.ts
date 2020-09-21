document.addEventListener("DOMContentLoaded", () => {
	setup_random_box_simulation();
});

const setup_random_box_simulation = () => {
	//enumerate options
	const options_area = document.getElementById("randomBoxOptionsArea");
	const results_table = document.getElementById("randomBoxResultsTable");
	if (options_area === null || results_table === null) {
		return;
	}
	for (const bonus of random_box_bonuses) {
		if (bonus.toggleable) {
			options_area.appendChild(create_checkbox(bonus));
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
	run_simulation();
};

//todo: load random_box_bonuses from a json file
const random_box_bonuses = [
	{
		chance: 1,
		name: "Found Coins",
		toggleable: false,
	},
	{
		chance: 0.3,
		name: "Frenzy",
		toggleable: false,
	},
	{
		chance: 0.04,
		name: "Equipment Bonus",
		toggleable: false,
	},
	{
		chance: 0.01,
		name: "OMG",
		toggleable: false,
	},
	{
		chance: 0.05,
		name: "Coin Value",
		toggleable: false,
	},
	{
		chance: 0.1,
		name: "Dual Randomness",
		toggleable: true,
	},
	{
		chance: 0.12,
		name: "Gemstone Rush",
		toggleable: true,
	},
	{
		chance: 0.2,
		name: "CpS Multiplier",
		toggleable: false,
	},
	{
		chance: 0.25,
		name: "Horde",
		toggleable: true,
	},
	{
		chance: 0.12,
		name: "Increase Souls",
		toggleable: true,
	},
];

interface Bonus {
	chance: number;
	name: string;
	toggleable: boolean;
}

//map from bonus name to toggled state, if toggleable
const toggled: Record<string, boolean> = random_box_bonuses
	.filter((b) => b.toggleable)
	.reduce<Record<string, boolean>>((accumulator, curr) => {
		accumulator[curr.name] = false;
		return accumulator;
	}, {});
const create_checkbox = (bonus: Bonus) => {
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.name = bonus.name;
	checkbox.classList.add("bonus_checkbox");
	checkbox.addEventListener("change", on_bonus_toggle);
	const label = document.createElement("label");
	label.textContent = bonus.name;
	if (bonus.name === "Horde") {
		label.textContent = "Map has flying enemies, or you have Mega Horde";
	}
	label.htmlFor = bonus.name;
	const container = document.createElement("div");
	container.appendChild(label);
	container.appendChild(checkbox);
	return container;
};

/** map of bonus name to its result cell */
const result_cells: Record<string, HTMLTableCellElement> = {};

/**
 * Called on a bonus's checkbox being changed
 * @param event
 */
const on_bonus_toggle = (event: Event) => {
	const bonus_name = (event.currentTarget as HTMLInputElement).name;
	if (toggled[bonus_name] === undefined) {
		toggled[bonus_name] = true;
	}
	else {
		toggled[bonus_name] = !toggled[bonus_name];
	}
	run_simulation();
};

const sort_table = () => {
	const table = document.getElementById("resultsTable") as HTMLTableElement;
	if (table === null) {
		return;
	}
	const store: Array<[number, HTMLTableRowElement]> = [];
	for (let i = 0, len = table.rows.length; i < len; i++) {
		const row = table.rows[i];
		if (row.cells[1].textContent === null) {
			continue;
		}
		const sort_value = parseFloat(row.cells[1].textContent);
		store.push([sort_value, row]);
	}
	store.sort((a, b) => b[0] - a[0]);
	for (const [_, row] of store) {
		table.appendChild(row);
	}
};
/**
 * Run the simulation. Chooses a random bonus `num_rounds` times and then puts the results in the table
 */
const run_simulation = () => {
	const num_success: Record<string, number> = {};
	for (const random_bonus of random_box_bonuses) {
		num_success[random_bonus.name] = 0;
	}
	const num_rounds = 100000;
	for (let run = 0; run < num_rounds; run++) {
		num_success[select_random_bonus().name]++;
	}
	for (const key of Object.keys(num_success)) {
		result_cells[key].textContent = `${((num_success[key] / num_rounds) * 100).toFixed(2)}%`;
	}
	sort_table();
};
/**
 * Shuffle the array in place, to pick from later
 * @param {Array<T>} array Array to shuffle
 */
const shuffle_array = <T>(array: Array<T>) => {
	let current_index = array.length,
		temp_value,
		random_index;
	// While there remain elements to shuffle...
	while (0 !== current_index) {
		// Pick a remaining element...
		random_index = Math.floor(Math.random() * current_index);
		current_index -= 1;
		// And swap it with the current element.
		temp_value = array[current_index];
		array[current_index] = array[random_index];
		array[random_index] = temp_value;
	}
	return array;
};
/**
 * Selects a random bonus according to the algorithm described by plab
 * Shuffles the array, and then goes down the list, attempting to choose each event
 * An event passes if it is toggled and if its chances pass
 */
const select_random_bonus = () => {
	let evt = null;
	do {
		shuffle_array(random_box_bonuses);
		for (const random_bonus of random_box_bonuses) {
			const chance = Math.random();
			if (chance <= random_bonus.chance) {
				evt = random_bonus;
			}
		}
	} while (evt !== null && toggled[evt.name] !== undefined && !toggled[evt.name]);
	//disabled warning because we don't break from the loop until it is not null... we could have an infinite loop here technically :shrug:
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return evt!;
};
