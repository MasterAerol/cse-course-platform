import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { env } from 'cloudflare:workers'
import { applyD1Migrations } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'

const e = env as Cloudflare.Env & { RECOVERY_CONSTRAINT_DB: D1Database; TEST_MIGRATIONS: D1Migration[] }
const db = e.RECOVERY_CONSTRAINT_DB
let course=0, subject=0, topic=0, lesson=0, practiceQuestion=0, quizQuestion=0, skill1=0, skill2=0
async function one(sql:string){const row=await db.prepare(sql).first<{id:number}>();if(!row)throw new Error(sql);return row.id}
async function user(key:string){const r=await db.prepare("INSERT INTO users(public_id,email,password_hash,first_name,last_name) VALUES(?1,?2,'x','R','U')").bind(`cu-${key}`,`${key}@constraints.test`).run();return Number(r.meta.last_row_id)}
async function attempt(key:string,userId:number,count=1){const r=await db.prepare(`INSERT INTO recovery_attempts(public_id,user_id,course_id,attempt_seed,idempotency_key,taxonomy_version,weakness_formula_version,question_count) VALUES(?1,?2,?3,?4,?5,1,1,?6)`).bind(`ca-${key}`,userId,course,`cs-${key}`,`ci-${key}`,count).run();return Number(r.meta.last_row_id)}
async function snapshot(key:string,attemptId:number,position=1,source="generated",fixedId:number|null=null){const generated=source==='generated';const r=await db.prepare(`INSERT INTO recovery_question_snapshots(public_id,attempt_id,source_position,skill_id,skill_slug,skill_title,subject_slug,subject_title,source_kind,practice_question_id,quiz_question_id,generator_slug,generator_version,generator_seed,prompt,explanation_json,parameters_json,metadata_json) VALUES(?1,?2,?3,?4,'finding-percentage','Finding Percentage','numerical-ability','Numerical Ability',?5,?6,?7,?8,?9,?10,?11,'{}','{}','{}')`).bind(`cq-${key}`,attemptId,position,skill1,source,source==='fixed_practice'?fixedId:null,source==='fixed_quiz'?fixedId:null,generated?'finding-percentage':null,generated?1:null,generated?`seed-${key}`:null,`Prompt ${key}`).run();return Number(r.meta.last_row_id)}

beforeAll(async()=>{
  await applyD1Migrations(db,e.TEST_MIGRATIONS,'constraint_migrations')
  course=await one("SELECT id FROM courses WHERE slug='cse-professional'")
  subject=await one("SELECT id FROM subjects WHERE slug='numerical-ability'")
  topic=await one("SELECT id FROM topics WHERE slug='percentages'")
  lesson=await one("SELECT id FROM lessons WHERE slug='finding-the-percentage'")
  practiceQuestion=await one('SELECT id FROM practice_questions ORDER BY id LIMIT 1')
  quizQuestion=await one('SELECT id FROM questions ORDER BY id LIMIT 1')
  const a=await db.prepare("INSERT INTO skills(public_id,slug,taxonomy_version,subject_id,topic_id,related_lesson_id,title) VALUES('constraint-skill-1','constraint-skill-1',1,?1,?2,?3,'One')").bind(subject,topic,lesson).run();skill1=Number(a.meta.last_row_id)
  const b=await db.prepare("INSERT INTO skills(public_id,slug,taxonomy_version,subject_id,topic_id,title) VALUES('constraint-skill-2','constraint-skill-2',1,?1,?2,'Two')").bind(subject,topic).run();skill2=Number(b.meta.last_row_id)
})

describe('0015 explicit identity and ownership constraints',()=>{
  it('rejects duplicate question/skill mappings and permits only one primary',async()=>{
    await db.prepare('INSERT INTO practice_question_skills(question_id,skill_id,is_primary,mapping_version) VALUES(?1,?2,1,1)').bind(practiceQuestion,skill1).run()
    await expect(db.prepare('INSERT INTO practice_question_skills(question_id,skill_id,is_primary,mapping_version) VALUES(?1,?2,1,1)').bind(practiceQuestion,skill1).run()).rejects.toThrow()
    await expect(db.prepare('INSERT INTO practice_question_skills(question_id,skill_id,is_primary,mapping_version) VALUES(?1,?2,1,1)').bind(practiceQuestion,skill2).run()).rejects.toThrow()
    await db.prepare('INSERT INTO quiz_question_skills(question_id,skill_id,is_primary,mapping_version) VALUES(?1,?2,1,1)').bind(quizQuestion,skill1).run()
    await expect(db.prepare('INSERT INTO quiz_question_skills(question_id,skill_id,is_primary,mapping_version) VALUES(?1,?2,1,1)').bind(quizQuestion,skill2).run()).rejects.toThrow()
  })
  it('rejects duplicate public IDs, idempotency keys, seeds, and active attempts',async()=>{
    const u=await user('identities');await attempt('identities',u)
    const other=await db.prepare("INSERT INTO courses(public_id,title,slug,status) VALUES('other-course','Other','other-course','draft')").run();const otherCourse=Number(other.meta.last_row_id)
    const base=`INSERT INTO recovery_attempts(public_id,user_id,course_id,attempt_seed,idempotency_key,taxonomy_version,weakness_formula_version,question_count) VALUES(?1,?2,?3,?4,?5,1,1,1)`
    await expect(db.prepare(base).bind('ca-identities',u,otherCourse,'new-seed','new-idem').run()).rejects.toThrow()
    await expect(db.prepare(base).bind('new-public',u,otherCourse,'new-seed','ci-identities').run()).rejects.toThrow()
    await expect(db.prepare(base).bind('new-public',u,otherCourse,'cs-identities','new-idem').run()).rejects.toThrow()
    await expect(db.prepare(base).bind('new-public',u,course,'new-seed','new-idem').run()).rejects.toThrow()
  })
  it('rejects duplicate fixed sources in one attempt',async()=>{
    const u=await user('fixed');const a=await attempt('fixed',u,4)
    await snapshot('fp1',a,1,'fixed_practice',practiceQuestion)
    await expect(snapshot('fp2',a,2,'fixed_practice',practiceQuestion)).rejects.toThrow()
    await snapshot('fq1',a,2,'fixed_quiz',quizQuestion)
    await expect(snapshot('fq2',a,3,'fixed_quiz',quizQuestion)).rejects.toThrow()
  })
  it('rejects cross-attempt snapshots and cross-snapshot selected choices',async()=>{
    const u1=await user('owner1'),u2=await user('owner2');const a1=await attempt('owner1',u1),a2=await attempt('owner2',u2)
    const s1=await snapshot('owner1',a1),s2=await snapshot('owner2',a2)
    const c=await db.prepare("INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('owner-choice',?1,'A',1,1)").bind(s1).run();const choice=Number(c.meta.last_row_id)
    await expect(db.prepare('INSERT INTO recovery_answers(attempt_id,snapshot_id) VALUES(?1,?2)').bind(a1,s2).run()).rejects.toThrow()
    await expect(db.prepare('INSERT INTO recovery_answers(attempt_id,snapshot_id,selected_choice_id) VALUES(?1,?2,?3)').bind(a2,s2,choice).run()).rejects.toThrow(/does not belong/)
  })
  it('rejects answer insertion and update after submission',async()=>{
    const u=await user('closed'),a=await attempt('closed',u),s=await snapshot('closed',a)
    const c=await db.prepare("INSERT INTO recovery_question_choices(public_id,snapshot_id,choice_text,is_correct,position) VALUES('closed-choice',?1,'A',1,1)").bind(s).run();const choice=Number(c.meta.last_row_id)
    await db.prepare('INSERT INTO recovery_answers(attempt_id,snapshot_id,selected_choice_id) VALUES(?1,?2,?3)').bind(a,s,choice).run()
    await db.prepare("UPDATE recovery_attempts SET status='submitted',score_percent=100,correct_count=1,submitted_at=CURRENT_TIMESTAMP WHERE id=?1").bind(a).run()
    await expect(db.prepare('UPDATE recovery_answers SET points_awarded=1 WHERE attempt_id=?1').bind(a).run()).rejects.toThrow(/immutable/)
    await expect(db.prepare('INSERT INTO recovery_answers(attempt_id,snapshot_id) VALUES(?1,?2)').bind(a,s).run()).rejects.toThrow()
  })
})
