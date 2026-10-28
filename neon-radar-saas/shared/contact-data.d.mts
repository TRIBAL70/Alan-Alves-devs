export function applyVerifiedContacts<T extends {id:string;name:string;address:string|null;lat:number|null;lng:number|null}>(place:T):T;
export function mergeContactDetails<T>(original:T,extra:Partial<T>):T;
