// copied from https://github.com/eclipse-zenoh/zenoh/blob/release/1.0.4/commons/zenoh-keyexpr/src/key_expr/borrowed.rs#L615
export function validate_keyexpr(value: string): boolean {
    const forbiddenChars = ['#', '?', '$'];
    let inBigWild = false;

    const chunks = value.split('/');
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk === '') {
            console.error(`Invalid Key Expr "${value}": empty chunks are forbidden, as well as leading and trailing slashes`);
            return false;
        }
        if (chunk === '$*') {
            console.error(`Invalid Key Expr "${value}": lone $*s must be replaced by * to reach canon-form`);
            return false;
        }
        if (inBigWild) {
            if (chunk === '**') {
                console.error(`Invalid Key Expr "${value}": **/** must be replaced by ** to reach canon-form`);
                return false;
            }
            if (chunk === '*') {
                console.error(`Invalid Key Expr "${value}": **/* must be replaced by */** to reach canon-form`);
                return false;
            }
        }
        if (chunk === '**') {
            inBigWild = true;
        } else {
            inBigWild = false;
            if (chunk !== '*') {
                const split = chunk.split('*');
                split.pop();
                if (split.some(s => !s.endsWith('$'))) {
                    console.error(`Invalid Key Expr "${value}": * and ** may only be preceded and followed by /`);
                    return false;
                }
            }
        }
    }

    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        if (forbiddenChars.includes(char)) {
            if (char === '$') {
                if (value[i + 1] === '*') {
                    if (value[i + 2] === '$') {
                        console.error(`Invalid Key Expr "${value}": $ is not allowed after $*`);
                        return false;
                    }
                } else {
                    console.error(`Invalid Key Expr "${value}": $ is only allowed in $*`);
                    return false;
                }
            } else {
                console.error(`Invalid Key Expr "${value}": # and ? are forbidden characters`);
                return false;
            }
        }
    }

    return true;
}
