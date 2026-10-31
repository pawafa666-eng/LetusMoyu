import type {ScholarResume} from './types'
export interface FinanceEntry {id:string;seq:number;at:number;amount:number;balance:number;direction:string;title:string;category:string;related:string}
export interface FinanceLedger {version:number;openedAt:number;openingBalance:number;balance:number;income:number;expense:number;sequence:number;byCategory:Record<string,{income:number;expense:number}>;entries:FinanceEntry[]}
export interface StudentRequest {id:string;studentId:string;studentName:string;kind:string;title:string;body:string;createdAt:number;status:'pending'|'invited'|'approved'|'discussed'|'declined'|'withdrawn';partnerId:string|null;partnerStudentId?:string;ownerId?:string;ownerName?:string;result?:string}
export interface LivingCross {id:string;title:string;status:string;dueAt:number;createdAt:number;sides:{owner:string;studentId:string}[]}
export interface Story {step:number;nextAt:number;memory:Record<string,boolean>;history:{id:string;title:string;sender:string;choice:string;result:string;at:number}[]}
export interface Alumnus {id:string;studentId:string;name:string;topic:string;career:string|null;organization:string;graduatedAt:number;nextContactAt:number;returnInterested?:boolean;returnedAt?:number;contact:{id:string;at:number;body:string}|null;history:{at:number;text:string}[]}
export interface Transfer {id:string;workId:string;title:string;route:string;status:string;paid:number;startedAt:number;dueAt:number;completedAt?:number;buffer:number;totalIncome:number;lastAt:number}
export interface Gift {id:string;option:string;from:string;to:string;name:string;note:string;sentAt:number;openedAt:number}
export interface LabNote {id:string;from:string;to:string;text:string;at:number}
export interface LivingState {requests?:StudentRequest[];nextRequestAt:number;story?:Story;alumni:Alumnus[];transfers:Transfer[];decor:string[];gifts:Gift[];notes:LabNote[];memories:{id:string;title:string;at:number}[]}
export interface FacultyCandidate {id:string;name:string;rank:string;specialty:string;kind:string;cost:number;rate:number;resume:ScholarResume}
export interface Faculty {id:string;candidateId:string;name:string;rank:string;specialty:string;kind:string;resume:ScholarResume;joinedAt:number;salary:{rate:number;buffer:number;total:number;lastAt:number};delegation:string;budget:number;spentBudget:number;budgetYear:number;lastGuidanceAt:number;studentIds:string[];outputs:number}
export interface Institute {faculty:Faculty[];candidates?:FacultyCandidate[];teams:{id:string;name:string;domain:string;facultyIds:string[];createdAt:number}[];workstation:{name:string;openedAt:number}|null}
export interface JointLane {owner:string;role:string;deliverable:string;status:string;progressPercent:number;mode?:string;paid?:number;startedAt?:number;dueAt?:number;studentId?:string|null;studentName?:string;stalled?:boolean}
export interface JointProject {id:string;option:string;title:string;host:string;members:string[];status:string;createdAt:number;dueAt?:number;completedAt?:number;lanes:JointLane[];history:{at:number;text:string}[];integration?:string}
