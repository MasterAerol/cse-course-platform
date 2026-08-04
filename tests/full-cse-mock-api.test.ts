import { env } from 'cloudflare:workers'
import { beforeAll,describe,expect,it } from 'vitest'
import { startMockRows } from '../src/worker/repositories/mock-exam.repository'
import { app } from '../src/worker/index'

describe('Full CSE mock persistence and timing',()=>{
  let timedId=0
  let untimedId=0
  beforeAll(async()=>{
    const course=await env.DB.prepare("SELECT id FROM courses WHERE slug='cse-professional'").first<{id:number}>();if(course===null)throw new Error('Seeded course missing.')
    const user=await env.DB.prepare("INSERT INTO users(public_id,email,password_hash,first_name,last_name) VALUES('mock-api-user','mock-api@example.test','test','Mock','Learner')").run();const userId=Number(user.meta.last_row_id)
    const mock=await env.DB.prepare("INSERT INTO mock_examinations(public_id,course_id,title,slug,description,simulation_label,position,passing_score,question_count,timed_duration_minutes,current_blueprint_version,status,source_url) VALUES('mock-api-exam',?1,'Mock API','mock-api-exam','test','PassPath Simulation Distribution v1',99,80,150,190,1,'draft','https://csc.gov.ph')").bind(course.id).run();const mockId=Number(mock.meta.last_row_id)
    const blueprint=await env.DB.prepare("INSERT INTO mock_exam_blueprints(mock_exam_id,version,label,total_questions,passing_score_percent,timed_duration_minutes,easy_count,medium_count,hard_count) VALUES(?1,1,'PassPath Simulation Distribution v1',150,80,190,45,75,30)").bind(mockId).run();const blueprintId=Number(blueprint.meta.last_row_id)
    const timed=await env.DB.prepare("INSERT INTO mock_exam_attempts(public_id,mock_exam_id,blueprint_id,user_id,attempt_seed,attempt_number,mode,total_points) VALUES('mock-timed-attempt',?1,?2,?3,'timed-seed',1,'timed',150)").bind(mockId,blueprintId,userId).run();timedId=Number(timed.meta.last_row_id)
    const untimed=await env.DB.prepare("INSERT INTO mock_exam_attempts(public_id,mock_exam_id,blueprint_id,user_id,attempt_seed,attempt_number,mode,total_points,status) VALUES('mock-untimed-attempt',?1,?2,?3,'untimed-seed',2,'untimed',150,'abandoned')").bind(mockId,blueprintId,userId).run();untimedId=Number(untimed.meta.last_row_id)
  })
  it('protects all learner and admin mock routes',async()=>{
    expect((await app.request('/api/student/mock-examinations/full-cse-professional-mock-examination',{},env)).status).toBe(401)
    expect((await app.request('/api/admin/mock-examinations/full-cse-professional-mock-examination',{},env)).status).toBe(401)
  })
  it('creates a server-authoritative 190-minute timed deadline',async()=>{
    const now=new Date('2026-08-04T00:00:00.000Z');const value=await startMockRows(env.DB,timedId,'timed',190,now)
    expect(value).toEqual({startedAt:'2026-08-04T00:00:00.000Z',deadlineAt:'2026-08-04T03:10:00.000Z'})
    const row=await env.DB.prepare('SELECT started_at,deadline_at FROM mock_exam_attempts WHERE id=?1').bind(timedId).first<{started_at:string;deadline_at:string}>()
    expect(row).toEqual({started_at:value.startedAt,deadline_at:value.deadlineAt})
    await env.DB.prepare("UPDATE mock_exam_attempts SET status='abandoned' WHERE id=?1").bind(timedId).run()
  })
  it('keeps untimed attempts deadline-free',async()=>{
    await env.DB.prepare("UPDATE mock_exam_attempts SET status='instructions' WHERE id=?1").bind(untimedId).run()
    const value=await startMockRows(env.DB,untimedId,'untimed',190,new Date('2026-08-04T00:00:00.000Z'))
    expect(value.deadlineAt).toBeNull()
  })
  it('installs immutable snapshot and choice triggers plus the one-active-attempt index',async()=>{
    const rows=await env.DB.prepare("SELECT name FROM sqlite_master WHERE name IN('trg_mock_snapshots_no_content_update','trg_mock_choices_no_update','idx_mock_attempt_one_active')").all<{name:string}>()
    expect(new Set(rows.results.map((row)=>row.name))).toEqual(new Set(['trg_mock_snapshots_no_content_update','trg_mock_choices_no_update','idx_mock_attempt_one_active']))
  })
})
