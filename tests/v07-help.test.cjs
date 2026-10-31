const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../cloudfunctions/letusMoyu/game.cjs');
test('老师协助学生返修仅扣一次费用，并在公开记录中保留协助标记',()=>{
 const now=1800000000000,s=G.createRoom('HELP','a','fafa','civil',now),p=s.players.a;
 p.admissions.candidates[0]._mind.ethic=1;
 G.execute(s,'a','student_hire',{id:p.admissions.candidates[0].id},now);
 const st=p.students[0];G.execute(s,'a','student_task',{id:st.id,type:'paper'},now);
 st.task.progress=st.task.target;G.Research.Portfolio.advancePoints(s,p,st,0,now);st.task._reviewRoll=.1;
 const at=now+2*G.HOUR;G.execute(s,'a','state',{},at);const before=p.funds;
 const v=G.execute(s,'a','student_review_help',{id:st.id},at);
 assert.equal(p.funds,before-20);assert.equal(st.task.progress,8);
 assert.equal(v.players.a.students[0].task.reviewHistory.at(-1).helpedAt,at);
 assert.throws(()=>G.execute(s,'a','student_review_help',{id:st.id},at),/已经协助/);
 assert.equal(p.funds,before-20);
});
