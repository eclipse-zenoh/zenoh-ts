# ⚠️ WARNING ⚠️

This crate is intended for Zenoh's internal use.

- [Click here for Zenoh's main repository](https://github.com/eclipse-zenoh/zenoh)
- [Click here for Zenoh's documentation](https://zenoh.io)

This crate is not meant to be built by users of Zenoh.

To build
`wasm-pack build`

The files:

- zenoh-keyexpr-wasm/pkg/zenoh_keyexpr_wrapper_bg.js
- zenoh-keyexpr-wasm/pkg/zenoh_keyexpr_wrapper_bg.wasm
- zenoh-keyexpr-wasm/pkg/zenoh_keyexpr_wrapper_bg.wasm.d.ts
- zenoh-keyexpr-wasm/pkg/zenoh_keyexpr_wrapper.d.ts
- zenoh-keyexpr-wasm/pkg/zenoh_keyexpr_wrapper.js

Are used from in zenoh-ts under `/src/key_expr`
