use std::convert::TryFrom;

use wasm_bindgen::prelude::*;
use zenoh_keyexpr::key_expr;

#[wasm_bindgen]
pub fn new_key_expr(key_expr_str: String) -> Result<(), String> {
    key_expr::OwnedKeyExpr::new(key_expr_str).map_err(|x| x.to_string())?;
    Ok(())
}

#[wasm_bindgen]
pub fn join(ke1: String, ke2: String) -> Result<String, String> {
    let a = key_expr::OwnedKeyExpr::new(ke1).map_err(|x| x.to_string())?;
    let b = key_expr::OwnedKeyExpr::new(ke2).map_err(|x| x.to_string())?;

    a.join(&b)
        .map(|x| x.to_string())
        .map_err(|err| err.to_string())
}

// Currently concat is not exposed in the commons::zenoh-keyexpr crate,
// its exposed in API, which does not compile to WASM.
// For now this is a simple reimplementation of the logic in API
// TODO: remove this logic and call concat once its been moved to zenoh-keyexpr
#[wasm_bindgen]
pub fn concat(ke1: String, ke2: String) -> Result<String, String> {
    if ke1.ends_with('*') && ke2.starts_with('*') {
        Err(format!("Tried to concatenate {} (ends with *) and {} (starts with *), which would likely have caused bugs. If you're sure you want to do this, concatenate these into a string and then try to convert.", ke1, ke2))
    } else {
        key_expr::OwnedKeyExpr::try_from(format!("{ke1}{ke2}"))
            .map_err(|x| x.to_string())
            .map(|x| x.to_string())
    }
}

#[wasm_bindgen]
pub fn includes(ke1: String, ke2: String) -> Result<bool, String> {
    let a = key_expr::OwnedKeyExpr::new(ke1).map_err(|x| x.to_string())?;
    let b = key_expr::OwnedKeyExpr::new(ke2).map_err(|x| x.to_string())?;
    Ok(a.includes(&b))
}

#[wasm_bindgen]
pub fn intersects(ke1: String, ke2: String) -> Result<bool, String> {
    let a = key_expr::OwnedKeyExpr::new(ke1).map_err(|x| x.to_string())?;
    let b = key_expr::OwnedKeyExpr::new(ke2).map_err(|x| x.to_string())?;
    Ok(a.intersects(&b))
}
