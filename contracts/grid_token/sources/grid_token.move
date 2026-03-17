module onegrid::grid_token {
    use one::coin::{Self, TreasuryCap};
    use one::transfer;
    use one::tx_context::{Self, TxContext};
    use one::url;
    use one::event;
    use std::option;
    use std::vector;

    public struct GRID_TOKEN has drop {}

    public struct GridMinted has copy, drop {
        recipient: address,
        amount: u64,
        round_id: u64,
    }

    fun init(witness: GRID_TOKEN, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            9,
            b"GRID",
            b"OneGrid Token",
            b"Reward token for OneGrid game winners on OneChain",
            option::some(url::new_unsafe_from_bytes(b"https://onegrid-zeta.vercel.app/logo.svg")),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    public entry fun mint_reward(
        cap: &mut TreasuryCap<GRID_TOKEN>,
        amount: u64,
        recipient: address,
        round_id: u64,
        ctx: &mut TxContext,
    ) {
        let reward = coin::mint(cap, amount, ctx);
        transfer::public_transfer(reward, recipient);
        event::emit(GridMinted { recipient, amount, round_id });
    }
}
