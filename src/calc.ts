enum SortDirection {
	asc,
	des,
}

const sort_direction_to_string = (dir: SortDirection): "asc" | "des" => {
	switch (dir) {
		case SortDirection.asc:
			return "asc";
		case SortDirection.des:
			return "des";
	}
};

document.addEventListener("DOMContentLoaded", () => {
	setup_random_box_simulation();
	void setup_map_value_area();
	const sortable_headers = document.querySelectorAll(".sortable");
	for (const header of sortable_headers) {
		header.addEventListener("click", change_table_sort);
	}
});

const load_json = <T>(url: string): Promise<T> => {
	return new Promise((resolve) => {
		const req = new XMLHttpRequest();
		req.onreadystatechange = () => {
			if (req.readyState === 4 && req.status === 200) {
				resolve(JSON.parse(req.responseText) as T);
			}
		};
		req.overrideMimeType("application/json");
		req.open("GET", `./build/data/${url}`, true);
		req.send();
	});
};

interface Enemy {
	coins: number;
	souls: number;
	evolution?: string;
	base: boolean;
}

interface Pattern {
	enemies: Array<string>;
	level: number;
}

interface IdleSlayerMap {
	name: string;
	patterns: Array<Pattern>;
}

const base_enemies: Array<Enemy> = [];
let enemies: Record<string, Enemy> = {};
let maps: Array<IdleSlayerMap> = [];
const map_value_result_cells: Record<string, { coins: HTMLTableCellElement; souls: HTMLTableCellElement }> = {};
let pattern_level_input: HTMLInputElement | null = null;
const evolved: Record<string, boolean> = {};
const MAX_PATTERN_LEVEL = 3;
const MIN_PATTERN_LEVEL = 1;

const setup_map_value_area = async (): Promise<void> => {
	enemies = await load_json<Record<string, Enemy>>("enemies.json");
	maps = await load_json<Array<IdleSlayerMap>>("maps.json");
	const bonus_index = maps.findIndex((m) => m.name === "Bonus Stage");
	if (bonus_index !== -1) {
		maps.splice(bonus_index, 1);
	}
	delete enemies["Soul Goblin"];
	delete enemies["Soul Hobgoblin"];
	delete enemies["Soul Goblin Chief"];
	const options_area = document.getElementById("mapValueOptionsArea");
	const evolutions_list = document.getElementById("mapValueEvolutionsList");
	const results_table = document.getElementById("mapValuesResultsTable");
	if (options_area === null || evolutions_list === null || results_table === null) {
		return;
	}
	for (const [name, enemy] of Object.entries(enemies)) {
		if (enemy.base) {
			let evolved_enemy = enemy;
			do {
				if (evolved_enemy.evolution === undefined) {
					break;
				}
				const evolved_name = evolved_enemy.evolution;
				evolved_enemy = enemies[evolved_enemy.evolution];
				evolutions_list.appendChild(create_evolution_checkbox(evolved_name));
			} while (evolved_enemy !== undefined);
			base_enemies.push(enemy);
		}
		evolved[name] = false;
	}
	for (const map of maps) {
		const coins = document.createElement("td");
		const souls = document.createElement("td");
		map_value_result_cells[map.name] = { coins, souls };
		const bonus_row = document.createElement("tr");
		const name_cell = document.createElement("td");
		name_cell.textContent = map.name;
		bonus_row.appendChild(name_cell);
		bonus_row.appendChild(coins);
		bonus_row.appendChild(souls);
		results_table.appendChild(bonus_row);
	}

	pattern_level_input = document.querySelector("input[name=maxPatternLevel]");
	if (pattern_level_input !== null) {
		pattern_level_input.value = String(1);
		pattern_level_input.addEventListener("change", () => {
			if (pattern_level_input !== null) {
				const current_pattern_level_value = Number(pattern_level_input.value);
				if (isNaN(current_pattern_level_value)) {
					pattern_level_input.value = String(MIN_PATTERN_LEVEL);
				}
				if (current_pattern_level_value > MAX_PATTERN_LEVEL) {
					pattern_level_input.value = String(MAX_PATTERN_LEVEL);
				}
				else if (current_pattern_level_value < MIN_PATTERN_LEVEL) {
					pattern_level_input.value = String(MIN_PATTERN_LEVEL);
				}
			}
			calculate_map_values();
		});
	}
	calculate_map_values();
};

const calculate_map_values = () => {
	if (pattern_level_input === null) {
		return;
	}
	const pattern_level = Number(pattern_level_input.value);
	for (const map of maps) {
		let souls = 0;
		let coins = 0;
		for (const pattern of map.patterns) {
			if (pattern.level > pattern_level) {
				continue;
			}
			for (const enemy_name of pattern.enemies) {
				let enemy_data = enemies[enemy_name];
				if (enemy_data === undefined) {
					console.log(`No enemy data found for ${enemy_name}, skipping enemy in pattern in ${map.name}`);
					continue;
				}
				//find the highest unlocked evolution for this enemy
				while (enemy_data.evolution !== undefined && evolved[enemy_data.evolution]) {
					if (enemies[enemy_data.evolution] === undefined) {
						console.log(`Enemy evolution ${enemy_data.evolution} not found, staying with ${JSON.stringify(enemy_data)}`);
						break;
					}
					else {
						enemy_data = enemies[enemy_data.evolution];
					}
				}
				souls += enemy_data.souls;
				coins += enemy_data.coins;
			}
		}
		map_value_result_cells[map.name].coins.innerText = String((coins / map.patterns.length).toFixed(2));
		map_value_result_cells[map.name].souls.innerText = String((souls / map.patterns.length).toFixed(2));
	}
	const table = document.querySelector("#mapValuesResultsTable")?.closest("table");
	if (table !== null && table !== undefined) {
		update_table_sort(table);
	}
};

const create_evolution_checkbox = (name: string) => {
	const checkbox = document.createElement("input");
	checkbox.type = "checkbox";
	checkbox.name = name.replace(/ /g, "_");
	checkbox.classList.add("bonus_checkbox");
	checkbox.addEventListener("change", on_evolution_toggle);
	const label = document.createElement("label");
	label.textContent = name;
	label.htmlFor = name;
	const container = document.createElement("li");
	container.appendChild(label);
	container.appendChild(checkbox);
	return container;
};

const find_evolution_base = (enemy_name: string): Enemy => {
	const enemy = enemies[enemy_name.replace(/_/g, " ")];
	if (enemy === undefined) {
		throw new Error(`Enemy ${enemy_name} is undefined! Cannot find base for this.`);
	}
	if (enemy.base) {
		return enemy;
	}
	const previous_enemy = Object.entries(enemies).find(([_, e]) => e.evolution === enemy_name.replace(/_/g, " "));
	if (previous_enemy === undefined) {
		throw new Error(`No enemy evolves into ${enemy_name}!`);
	}
	return find_evolution_base(previous_enemy[0]);
};

const on_evolution_toggle = (event: Event) => {
	const enemy_name = (event.currentTarget as HTMLInputElement).name.replace(/_/g, " ");
	evolved[enemy_name] = !evolved[enemy_name];
	let enemy = find_evolution_base(enemy_name);
	//make sure all evolutions are checked that are before this
	const is_checked = evolved[enemy_name];
	let enemy_encountered = false;
	do {
		if (enemy.evolution === undefined) {
			break;
		}
		if ((is_checked && !enemy_encountered) || (!is_checked && enemy_encountered)) {
			const checkbox = document.querySelector(`input[name=${enemy.evolution.replace(/ /g, "_")}]`) as HTMLInputElement;
			if (checkbox !== null) {
				checkbox.checked = evolved[enemy_name];
			}
			evolved[enemy.evolution] = evolved[enemy_name];
		}

		if (enemy.evolution === enemy_name) {
			enemy_encountered = true;
		}
		enemy = enemies[enemy.evolution];
		// eslint-disable-next-line no-constant-condition
	} while (true);
	calculate_map_values();
};

const change_table_sort = (event: Event) => {
	const header = event.currentTarget as HTMLElement;
	const current_dir = header.classList.contains(sort_direction_to_string(SortDirection.des)) ? SortDirection.des : SortDirection.asc;
	const new_dir = current_dir === SortDirection.asc ? SortDirection.des : SortDirection.asc;
	const header_name = header.textContent;
	const all_headers = header.closest("tr")?.childNodes;
	if (all_headers === undefined) {
		return;
	}
	let header_idx = -1;
	let count = 0;
	for (const header_element of all_headers) {
		if (header_element.nodeType === 1) {
			(header_element as HTMLElement).classList.remove(sort_direction_to_string(SortDirection.asc), sort_direction_to_string(SortDirection.des));
			if (header_element.textContent === header_name) {
				header_idx = count;
			}
			count++;
		}
	}
	header.classList.add(sort_direction_to_string(new_dir));
	if (header_idx === -1) {
		return;
	}
	const table = header.closest("table");
	const t_body = table?.getElementsByTagName("tbody")?.item(0);
	if (t_body === null || t_body === undefined) {
		return;
	}
	sort_table_inner(t_body, header_idx, new_dir);
};

const update_table_sort = (table: HTMLElement) => {
	//find header indicating sort
	const headers = table.querySelectorAll("th");
	let idx = 0;
	let header_idx = -1;
	let sort_dir = SortDirection.des;
	for (const header of headers) {
		if (header.nodeType === 1) {
			if (header.classList.contains(sort_direction_to_string(SortDirection.des))) {
				sort_dir = SortDirection.des;
				header_idx = idx;
				break;
			}
			if (header.classList.contains(sort_direction_to_string(SortDirection.asc))) {
				sort_dir = SortDirection.asc;
				header_idx = idx;
				break;
			}
			idx++;
		}
	}
	const t_body = table.querySelector("tbody");
	if (t_body === null || header_idx === -1) {
		return;
	}
	sort_table_inner(t_body, header_idx, sort_dir);
};

const sort_table_inner = (t_body: HTMLElement, header_idx: number, dir: SortDirection) => {
	const rows: Array<HTMLTableRowElement> = [];
	for (const element of t_body.childNodes) {
		if (element.nodeType == 1) {
			rows.push(element as HTMLTableRowElement);
		}
	}
	rows.sort((a, b) => {
		const a_sort_value = Number(a.childNodes[header_idx].textContent);
		const b_sort_value = Number(b.childNodes[header_idx].textContent);
		if (!isNaN(a_sort_value) && !isNaN(b_sort_value)) {
			switch (dir) {
				case SortDirection.asc:
					return a_sort_value - b_sort_value;
				case SortDirection.des:
					return b_sort_value - a_sort_value;
			}
		}
		else {
			//fall back to string comparison
			const a_text = a.childNodes[header_idx].textContent;
			const b_text = b.childNodes[header_idx].textContent;
			switch (dir) {
				case SortDirection.asc:
					if (a_text !== null && b_text !== null) {
						return a_text.localeCompare(b_text);
					}
					if (a_text === null && b_text === null) {
						return 0;
					}
					else if (a_text === null) {
						return 1;
					}
					else {
						return -1;
					}
				case SortDirection.des:
					if (a_text !== null && b_text !== null) {
						return b_text.localeCompare(a_text);
					}
					if (a_text === null && b_text === null) {
						return 0;
					}
					else if (a_text === null) {
						return -1;
					}
					else {
						return 1;
					}
			}
		}
	});
	for (const row of rows) {
		t_body.appendChild(row);
	}
};

const setup_random_box_simulation = () => {
	//enumerate options
	const options_area = document.getElementById("randomBoxOptionsArea");
	const results_table = document.getElementById("randomBoxResultsTable");
	if (options_area === null || results_table === null) {
		return;
	}
	for (const bonus of random_box_bonuses) {
		if (bonus.toggleable) {
			options_area.appendChild(create_random_box_checkbox(bonus));
		}
		const result_cell = document.createElement("td");
		random_box_result_cells[bonus.name] = result_cell;
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
const create_random_box_checkbox = (bonus: Bonus) => {
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
const random_box_result_cells: Record<string, HTMLTableCellElement> = {};

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

const sort_random_box_table = () => {
	const table = document.getElementById("randomBoxResultsTable") as HTMLTableElement;
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
		random_box_result_cells[key].textContent = `${((num_success[key] / num_rounds) * 100).toFixed(2)}%`;
	}
	sort_random_box_table();
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
