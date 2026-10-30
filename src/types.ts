export interface Paper {phase:'draft'|'review'|'major'|'minor';progress:number;bank:number;reviewAt:number;round:number;required:number}
export interface Encounter {type:string;event?:number;project?:number;dice?:number;bus?:boolean;expires:number}
export interface Player {id:string;name:string;discipline:'civil'|'air';funds:number;energy:number;energyAt:number;position:number;mood:number;tutor:number;rep:number;papers:number;credits:number;actionCount:number;cardUsed:boolean;hand?:number[];equipment:string[];active:string[];paper:Paper;pending?:Encounter|null;donated:number;registeredRep:number}
export interface Project {def:number;owner:string;lastAt:number;elapsed:number;value:number;stock:{funds:number;progress:number}[]}
export interface Effect {id:string;type:string;source:string;target:string;expires:number;project?:number;item?:string;negative?:boolean;done?:boolean}
export interface RoomState {id:string;self:string;serverNow:number;version:number;createdAt:number;players:Record<string,Player>;projects:Record<string,Project>;effects:Effect[];feed:{id:string;text:string;at:number;kind:string}[];lab:{level:number;funds:number;credits:number;rep:number}}
export interface ApiResult {ok:boolean;state?:RoomState|null;uid?:string;savedAt?:number;replayed?:boolean;error?:string}
