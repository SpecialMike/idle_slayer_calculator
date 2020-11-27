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
const map_active_value_result_cells: Record<string, { coins: HTMLTableCellElement; souls: HTMLTableCellElement }> = {};
const map_idle_value_result_cells: Record<string, { coins: HTMLTableCellElement; souls: HTMLTableCellElement }> = {};
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
	const active_results_table = document.getElementById("mapValuesResultsTableActive");
	const idle_results_table = document.getElementById("mapValuesResultsTableIdle");
	if (options_area === null || evolutions_list === null || active_results_table === null || idle_results_table === null) {
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
	const create_map_row = (table: HTMLElement, map: IdleSlayerMap, type: "active" | "idle") => {
		const coins = document.createElement("td");
		const souls = document.createElement("td");
		if (type === "active") {
			map_active_value_result_cells[map.name] = { coins, souls };
		}
		else if (type === "idle") {
			map_idle_value_result_cells[map.name] = { coins, souls };
		}
		const map_row = document.createElement("tr");
		const map_name_cell = document.createElement("td");
		map_name_cell.textContent = map.name;
		map_row.appendChild(map_name_cell);
		map_row.appendChild(coins);
		map_row.appendChild(souls);
		table.appendChild(map_row);
	};
	for (const map of maps) {
		create_map_row(active_results_table, map, "active");
		create_map_row(idle_results_table, map, "idle");
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
	calculate_map_values_active();
	calculate_map_values_idle();
};

const calculate_map_values_active = () => {
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
		map_active_value_result_cells[map.name].coins.innerText = String((coins / map.patterns.length).toFixed(2));
		map_active_value_result_cells[map.name].souls.innerText = String((souls / map.patterns.length).toFixed(2));
	}
	const table = document.querySelector("#mapValuesResultsTableActive")?.closest("table");
	if (table !== null && table !== undefined) {
		update_table_sort(table);
	}
};

const calculate_map_values_idle = () => {
	//pattern level doesn't matter, it's all about what enemies are capable of spawning in a map

	for (const map of maps) {
		const map_enemies = new Set<string>();
		let coins = 0;
		let souls = 0;
		for (const pattern of map.patterns) {
			for (const enemy_name of pattern.enemies) {
				map_enemies.add(enemy_name);
			}
		}
		for (const enemy_name of Array.from(map_enemies)) {
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
			coins += enemy_data.coins;
			souls += enemy_data.souls;
		}
		map_idle_value_result_cells[map.name].coins.innerText = String((coins / map_enemies.size).toFixed(2));
		map_idle_value_result_cells[map.name].souls.innerText = String((souls / map_enemies.size).toFixed(2));
	}
	const table = document.querySelector("#mapValuesResultsTableIdle")?.closest("table");
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

	const divinity_checkbox = document.createElement("input");
	divinity_checkbox.type = "checkbox";
	divinity_checkbox.checked = random_box_reduce_found_coins;
	divinity_checkbox.addEventListener("change", () => {
		random_box_reduce_found_coins = divinity_checkbox.checked;
		get_box_probabilities();
	});
	divinity_checkbox.name = "divinity_checkbox";
	const label = document.createElement("label");
	label.textContent = "Less Coins More Fun Divinity Bought";
	label.htmlFor = "divinity_checkbox";
	const container = document.createElement("div");
	container.appendChild(label);
	container.appendChild(divinity_checkbox);
	options_area.appendChild(container);
	get_box_probabilities();
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
let random_box_reduce_found_coins = false;

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
	get_box_probabilities();
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
 * Credit to Scion#7777 from the IdleSlayer discord for this
 */
class Distribution {
	dist: Record<string, number>;
	empty: number;
	constructor() {
		this.dist = {};
		this.empty = 1;
		for (const box of random_box_bonuses) {
			this.dist[box.name] = 0;
		}
		this.update();
	}

	update() {
		this.empty = 1;
		for (const box of random_box_bonuses) {
			this.empty -= this.dist[box.name];
		}
	}

	add(other: Distribution) {
		for (const box of random_box_bonuses) {
			this.dist[box.name] += other.dist[box.name];
		}
	}

	divide(scalar: number) {
		for (const box of random_box_bonuses) {
			this.dist[box.name] /= scalar;
		}
	}

	normalize() {
		this.divide(1 - this.empty);
	}
}

let distribution_cache: Record<string, Distribution> = {};

/**
 * Calculate the distribution of bonuses from the random box.
 *
 * Credit to Scion#7777 from the IdleSlayer discord for this
 */
const calculate_distribution = (box_set: Array<Bonus>): Distribution => {
	const set_names = box_set.map((box) => box.name).join("");
	if (distribution_cache[set_names] != undefined) {
		return distribution_cache[set_names];
	}

	const new_dist = new Distribution();
	// 1. If set has only 1 element, calculate it.
	if (box_set.length === 1) {
		for (const out of box_set) {
			new_dist.dist[out.name] = out.chance;
			new_dist.update();
		}
		distribution_cache[set_names] = new_dist;
		return new_dist;
	}
	// 2. Otherwise, calculate it in function of the subsets
	//
	// Idea: take each element, pretend it's the last one in the shuffle.
	// The resulting distribution is the same as that of the reduced set, except
	// probability of the last element is its base probability * reduced.empty.
	//
	// Calculating the average after making each element of the set be the last
	// gives the final distribution.
	for (const [last_idx, last] of box_set.entries()) {
		const reduced_set = [...box_set];
		reduced_set.splice(last_idx, 1);
		const reduced = calculate_distribution(reduced_set);
		new_dist.add(reduced);
		new_dist.dist[last.name] += last.chance * reduced.empty;
	}
	new_dist.divide(box_set.length);
	new_dist.update();
	distribution_cache[set_names] = new_dist;
	return new_dist;
};
/**
 * Get the probabilities of getting random boxes, and update the table with the probabilities.
 */
const get_box_probabilities = () => {
	const filtered_boxes = random_box_bonuses.filter((bonus) => toggled[bonus.name] === undefined || toggled[bonus.name]);
	const idx = filtered_boxes.findIndex((box) => box.name === "Found Coins");
	if (random_box_reduce_found_coins) {
		filtered_boxes[idx].chance = 0.9;
	}
	else {
		filtered_boxes[idx].chance = 1;
	}
	const distribution = calculate_distribution(filtered_boxes);
	distribution.normalize();
	for (const [key, probability] of Object.entries(distribution.dist)) {
		random_box_result_cells[key].textContent = `${(probability * 100).toFixed(2)}%`;
	}
	//clear cache
	distribution_cache = {};
	sort_random_box_table();
};
