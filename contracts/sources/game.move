#[allow(unused_const, lint(public_entry))]
module onegrid::game {
    use one::coin::{Self, Coin};
    use one::oct::OCT;
    use one::balance::{Self, Balance};
    use one::clock::{Self, Clock};
    use one::event;
    use one::table::{Self, Table};
    use one::tx_context;

    const GRID_SIZE: u64 = 25;
    const BPS_BASE: u64 = 10_000;

    const EInvalidCell: u64 = 0;
    const ERoundEnded: u64 = 1;
    const EAlreadyJoined: u64 = 2;
    const EInsufficientPayment: u64 = 3;
    const ENotResolver: u64 = 4;
    const ERoundNotEnded: u64 = 5;
    const EAlreadyResolved: u64 = 6;
    const ENoPlayers: u64 = 7;
    const EHasPlayers: u64 = 8;
    const EWrongRound: u64 = 9;
    const ERoundNotActive: u64 = 10;
    const EFeeTooHigh: u64 = 11;

    public struct AdminCap has key, store { id: UID }

    public struct Grid has key {
        id: UID,
        entry_fee: u64,
        round_duration_ms: u64,
        protocol_fee_bps: u64,
        fee_recipient: address,
        current_round_id: u64,
        round_start_ms: u64,
        round_end_ms: u64,
        round_resolved: bool,
        pool: Balance<OCT>,
        accumulated_fees: Balance<OCT>,
        cells: Table<u64, vector<address>>,
        player_cells: Table<address, u64>,
        total_players: u64,
        total_rounds: u64,
        total_volume: u64,
    }

    public struct RoundStarted has copy, drop { round_id: u64, start_ms: u64, end_ms: u64 }
    public struct CellPicked has copy, drop { round_id: u64, player: address, cell: u64 }
    public struct RoundResolved has copy, drop { round_id: u64, winning_cell: u64, winners_count: u64, total_pot: u64, payout_per_winner: u64 }
    public struct WinningsPaid has copy, drop { round_id: u64, player: address, amount: u64 }
    public struct EmptyRoundSkipped has copy, drop { round_id: u64 }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
        let mut cells = table::new<u64, vector<address>>(ctx);
        let mut i = 0;
        while (i < GRID_SIZE) { table::add(&mut cells, i, vector::empty<address>()); i = i + 1; };
        transfer::share_object(Grid {
            id: object::new(ctx), entry_fee: 100_000_000, round_duration_ms: 60_000,
            protocol_fee_bps: 500, fee_recipient: tx_context::sender(ctx),
            current_round_id: 0, round_start_ms: 0, round_end_ms: 0, round_resolved: true,
            pool: balance::zero<OCT>(), accumulated_fees: balance::zero<OCT>(), cells,
            player_cells: table::new<address, u64>(ctx), total_players: 0, total_rounds: 0, total_volume: 0,
        });
    }

    public entry fun start_round(grid: &mut Grid, clk: &Clock, _admin: &AdminCap) {
        assert!(grid.round_resolved, ERoundNotActive);
        grid.current_round_id = grid.current_round_id + 1;
        grid.round_start_ms = clock::timestamp_ms(clk);
        grid.round_end_ms = grid.round_start_ms + grid.round_duration_ms;
        grid.round_resolved = false; grid.total_players = 0; grid.total_rounds = grid.total_rounds + 1;
        let mut i = 0;
        while (i < GRID_SIZE) { let cp = table::borrow_mut(&mut grid.cells, i); *cp = vector::empty<address>(); i = i + 1; };
        event::emit(RoundStarted { round_id: grid.current_round_id, start_ms: grid.round_start_ms, end_ms: grid.round_end_ms });
    }

    public entry fun resolve_round(grid: &mut Grid, clk: &Clock, _admin: &AdminCap, ctx: &mut TxContext) {
        assert!(!grid.round_resolved, EAlreadyResolved);
        assert!(clock::timestamp_ms(clk) >= grid.round_end_ms, ERoundNotEnded);
        assert!(grid.total_players > 0, ENoPlayers);
        let mut occupied = vector::empty<u64>();
        let mut i = 0;
        while (i < GRID_SIZE) {
            let players: &vector<address> = table::borrow(&grid.cells, i);
            if (vector::length(players) > 0) { vector::push_back(&mut occupied, i); }; i = i + 1;
        };
        let occupied_count = vector::length(&occupied);
        let random_seed = tx_context::digest(ctx);
        let mut seed_value: u64 = 0; let mut j = 0;
        while (j < 8 && j < vector::length(random_seed)) {
            seed_value = (seed_value << 8) | (*vector::borrow(random_seed, j) as u64); j = j + 1;
        };
        let winning_cell = *vector::borrow(&occupied, seed_value % occupied_count);
        let winners: vector<address> = *table::borrow(&grid.cells, winning_cell);
        let winners_count = vector::length(&winners);
        let total_pot = balance::value(&grid.pool);
        let protocol_fee = (total_pot * grid.protocol_fee_bps) / BPS_BASE;
        let distributable = total_pot - protocol_fee;
        let payout_per_winner = if (winners_count > 0) { distributable / winners_count } else { 0 };
        balance::join(&mut grid.accumulated_fees, balance::split(&mut grid.pool, protocol_fee));
        let mut k = 0;
        while (k < winners_count) {
            let winner: address = *vector::borrow(&winners, k);
            if (payout_per_winner > 0) {
                transfer::public_transfer(coin::from_balance(balance::split(&mut grid.pool, payout_per_winner), ctx), winner);
                event::emit(WinningsPaid { round_id: grid.current_round_id, player: winner, amount: payout_per_winner });
            }; k = k + 1;
        };
        let dust = balance::value(&grid.pool);
        if (dust > 0) { balance::join(&mut grid.accumulated_fees, balance::split(&mut grid.pool, dust)); };
        grid.round_resolved = true;
        event::emit(RoundResolved { round_id: grid.current_round_id, winning_cell, winners_count, total_pot, payout_per_winner });
    }

    public entry fun skip_empty_round(grid: &mut Grid, clk: &Clock, _admin: &AdminCap) {
        assert!(!grid.round_resolved, EAlreadyResolved);
        assert!(clock::timestamp_ms(clk) >= grid.round_end_ms, ERoundNotEnded);
        assert!(grid.total_players == 0, EHasPlayers);
        grid.round_resolved = true;
        event::emit(EmptyRoundSkipped { round_id: grid.current_round_id });
    }

    public entry fun pick_cell(grid: &mut Grid, cell: u64, payment: Coin<OCT>, clk: &Clock, ctx: &mut TxContext) {
        assert!(cell < GRID_SIZE, EInvalidCell);
        assert!(!grid.round_resolved, ERoundNotActive);
        assert!(clock::timestamp_ms(clk) < grid.round_end_ms, ERoundEnded);
        assert!(coin::value(&payment) >= grid.entry_fee, EInsufficientPayment);
        let player = tx_context::sender(ctx);
        assert!(!table::contains(&grid.player_cells, player), EAlreadyJoined);
        let mut payment_balance = coin::into_balance(payment);
        let entry_balance = balance::split(&mut payment_balance, grid.entry_fee);
        let change = balance::value(&payment_balance);
        if (change > 0) { transfer::public_transfer(coin::from_balance(payment_balance, ctx), player); }
        else { balance::destroy_zero(payment_balance); };
        balance::join(&mut grid.pool, entry_balance);
        grid.total_volume = grid.total_volume + grid.entry_fee;
        table::add(&mut grid.player_cells, player, cell + 1);
        let cell_players = table::borrow_mut(&mut grid.cells, cell);
        vector::push_back(cell_players, player);
        grid.total_players = grid.total_players + 1;
        event::emit(CellPicked { round_id: grid.current_round_id, player, cell });
    }

    public fun get_cell_counts(grid: &Grid): vector<u64> {
        let mut counts = vector::empty<u64>(); let mut i = 0;
        while (i < GRID_SIZE) {
            let players: &vector<address> = table::borrow(&grid.cells, i);
            vector::push_back(&mut counts, vector::length(players)); i = i + 1;
        }; counts
    }

    public fun get_round_info(grid: &Grid): (u64, u64, u64, u64, u64, bool) {
        (grid.current_round_id, grid.round_start_ms, grid.round_end_ms, balance::value(&grid.pool), grid.total_players, grid.round_resolved)
    }

    public fun has_joined(grid: &Grid, player: address): bool { table::contains(&grid.player_cells, player) }
    public fun get_player_cell(grid: &Grid, player: address): u64 {
        if (table::contains(&grid.player_cells, player)) { *table::borrow(&grid.player_cells, player) - 1 } else { GRID_SIZE }
    }
    public fun get_entry_fee(grid: &Grid): u64 { grid.entry_fee }
    public fun get_total_volume(grid: &Grid): u64 { grid.total_volume }
    public fun get_total_rounds(grid: &Grid): u64 { grid.total_rounds }

    public entry fun withdraw_fees(grid: &mut Grid, _admin: &AdminCap, ctx: &mut TxContext) {
        let amount = balance::value(&grid.accumulated_fees);
        if (amount > 0) { transfer::public_transfer(coin::from_balance(balance::split(&mut grid.accumulated_fees, amount), ctx), grid.fee_recipient); };
    }

    public entry fun set_entry_fee(grid: &mut Grid, _admin: &AdminCap, v: u64) { grid.entry_fee = v; }
    public entry fun set_round_duration(grid: &mut Grid, _admin: &AdminCap, v: u64) { grid.round_duration_ms = v; }
    public entry fun set_protocol_fee(grid: &mut Grid, _admin: &AdminCap, v: u64) { assert!(v <= 2000, EFeeTooHigh); grid.protocol_fee_bps = v; }
    public entry fun set_fee_recipient(grid: &mut Grid, _admin: &AdminCap, v: address) { grid.fee_recipient = v; }

    public entry fun clear_round_data(grid: &mut Grid, _admin: &AdminCap) {
        let mut i = 0;
        while (i < GRID_SIZE) {
            let players: vector<address> = *table::borrow(&grid.cells, i);
            let len = vector::length(&players); let mut j = 0;
            while (j < len) {
                let player: address = *vector::borrow(&players, j);
                if (table::contains(&grid.player_cells, player)) { table::remove(&mut grid.player_cells, player); };
                j = j + 1;
            }; i = i + 1;
        };
    }
}
