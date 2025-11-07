//
// Copyright (c) 2025 ZettaScale Technology
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0, or the Apache License, Version 2.0
// which is available at https://www.apache.org/licenses/LICENSE-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR Apache-2.0
//
// Contributors:
//   ZettaScale Zenoh Team, <zenoh@zettascale.tech>
//

type CancelAction = () => void;

/**
 * A cancellation token, that can be used for interrupting GET queries.
 * 
 * Warning: This API has been marked as unstable: it works as advertised, but it may be changed in a future release.
 */
export class CancellationToken {
    private actions_: CancelAction[];
    private isCancelled_: boolean;

    public constructor() {
        this.actions_ = [];
        this.isCancelled_ = false;
    }

    /**
     * Check if token was already cancelled.
     * 
     * @returns true if token was cancelled (i.e. if @see cancel method was called), false otherwise.
     */
    public isCancelled(): boolean {
        return this.isCancelled_;
    }

    /**
     * Interrupt all associated GET queries. This will unregister their callbacks (and call corresponding drop functions if provided).
     * Passing already cancelled token to any GET query will automatically cancel it.
     */
    public cancel(): void {
        for (let action of this.actions_) {
            action();
        }
        this.actions_ = [];
        this.isCancelled_ = true;
    }

    /** @internal */
    public addCancelAction(action: CancelAction): void {
        if (this.isCancelled_) {
            action();
        } else {
            this.actions_.push(action);
        }
    }
}
