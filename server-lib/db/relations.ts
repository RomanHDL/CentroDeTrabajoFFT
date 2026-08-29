import { relations } from 'drizzle-orm/relations'
import {
  employee,
  user,
  importedAttendanceReference,
  employeeImportSource,
  workArea,
  workstation,
  skill,
  importBatch,
  employeeSkill,
  bajaConflict,
  employeeReconciliationCandidate,
  dailyAssignment,
  employeeMovement,
  attendance,
  pendingMove,
  userModulePermission,
} from './schema.ts'

export const userRelations = relations(user, ({ one, many }) => ({
  employee: one(employee, {
    fields: [user.employeeId],
    references: [employee.id],
  }),
  importBatches: many(importBatch),
  employeeSkills_addedByUserId: many(employeeSkill, {
    relationName: 'employeeSkill_addedByUserId_user_id',
  }),
  employeeSkills_deactivatedByUserId: many(employeeSkill, {
    relationName: 'employeeSkill_deactivatedByUserId_user_id',
  }),
  bajaConflicts: many(bajaConflict),
  employeeReconciliationCandidates: many(employeeReconciliationCandidate),
  dailyAssignments_assignedByUserId: many(dailyAssignment, {
    relationName: 'dailyAssignment_assignedByUserId_user_id',
  }),
  dailyAssignments_endedByUserId: many(dailyAssignment, {
    relationName: 'dailyAssignment_endedByUserId_user_id',
  }),
  employeeMovements: many(employeeMovement),
  attendances: many(attendance),
  pendingMoves_requestedByUserId: many(pendingMove, {
    relationName: 'pendingMove_requestedByUserId_user_id',
  }),
  pendingMoves_resolvedByUserId: many(pendingMove, {
    relationName: 'pendingMove_resolvedByUserId_user_id',
  }),
  userModulePermissions: many(userModulePermission),
}))

export const employeeRelations = relations(employee, ({ many }) => ({
  users: many(user),
  importedAttendanceReferences: many(importedAttendanceReference),
  employeeImportSources: many(employeeImportSource),
  employeeSkills: many(employeeSkill),
  bajaConflicts: many(bajaConflict),
  employeeReconciliationCandidates: many(employeeReconciliationCandidate),
  dailyAssignments: many(dailyAssignment),
  employeeMovements: many(employeeMovement),
  attendances: many(attendance),
  pendingMoves: many(pendingMove),
}))

export const importedAttendanceReferenceRelations = relations(
  importedAttendanceReference,
  ({ one }) => ({
    employee: one(employee, {
      fields: [importedAttendanceReference.employeeId],
      references: [employee.id],
    }),
    employeeImportSource: one(employeeImportSource, {
      fields: [importedAttendanceReference.employeeImportSourceId],
      references: [employeeImportSource.id],
    }),
  }),
)

export const employeeImportSourceRelations = relations(employeeImportSource, ({ one, many }) => ({
  importedAttendanceReferences: many(importedAttendanceReference),
  employee: one(employee, {
    fields: [employeeImportSource.employeeId],
    references: [employee.id],
  }),
  importBatch: one(importBatch, {
    fields: [employeeImportSource.importBatchId],
    references: [importBatch.id],
  }),
}))

export const workstationRelations = relations(workstation, ({ one, many }) => ({
  workArea: one(workArea, {
    fields: [workstation.workAreaId],
    references: [workArea.id],
  }),
  skill: one(skill, {
    fields: [workstation.requiredSkillId],
    references: [skill.id],
  }),
  dailyAssignments: many(dailyAssignment),
  employeeMovements_fromWorkstationId: many(employeeMovement, {
    relationName: 'employeeMovement_fromWorkstationId_workstation_id',
  }),
  employeeMovements_toWorkstationId: many(employeeMovement, {
    relationName: 'employeeMovement_toWorkstationId_workstation_id',
  }),
  pendingMoves_fromWorkstationId: many(pendingMove, {
    relationName: 'pendingMove_fromWorkstationId_workstation_id',
  }),
  pendingMoves_toWorkstationId: many(pendingMove, {
    relationName: 'pendingMove_toWorkstationId_workstation_id',
  }),
}))

export const workAreaRelations = relations(workArea, ({ many }) => ({
  workstations: many(workstation),
}))

export const skillRelations = relations(skill, ({ many }) => ({
  workstations: many(workstation),
  employeeSkills: many(employeeSkill),
}))

export const importBatchRelations = relations(importBatch, ({ one, many }) => ({
  user: one(user, {
    fields: [importBatch.triggeredByUserId],
    references: [user.id],
  }),
  employeeImportSources: many(employeeImportSource),
  bajaConflicts: many(bajaConflict),
  employeeReconciliationCandidates: many(employeeReconciliationCandidate),
}))

export const employeeSkillRelations = relations(employeeSkill, ({ one }) => ({
  employee: one(employee, {
    fields: [employeeSkill.employeeId],
    references: [employee.id],
  }),
  skill: one(skill, {
    fields: [employeeSkill.skillId],
    references: [skill.id],
  }),
  user_addedByUserId: one(user, {
    fields: [employeeSkill.addedByUserId],
    references: [user.id],
    relationName: 'employeeSkill_addedByUserId_user_id',
  }),
  user_deactivatedByUserId: one(user, {
    fields: [employeeSkill.deactivatedByUserId],
    references: [user.id],
    relationName: 'employeeSkill_deactivatedByUserId_user_id',
  }),
}))

export const bajaConflictRelations = relations(bajaConflict, ({ one }) => ({
  employee: one(employee, {
    fields: [bajaConflict.employeeId],
    references: [employee.id],
  }),
  importBatch: one(importBatch, {
    fields: [bajaConflict.importBatchId],
    references: [importBatch.id],
  }),
  user: one(user, {
    fields: [bajaConflict.resolvedByUserId],
    references: [user.id],
  }),
}))

export const employeeReconciliationCandidateRelations = relations(
  employeeReconciliationCandidate,
  ({ one }) => ({
    employee: one(employee, {
      fields: [employeeReconciliationCandidate.existingEmployeeId],
      references: [employee.id],
    }),
    importBatch: one(importBatch, {
      fields: [employeeReconciliationCandidate.importBatchId],
      references: [importBatch.id],
    }),
    user: one(user, {
      fields: [employeeReconciliationCandidate.resolvedByUserId],
      references: [user.id],
    }),
  }),
)

export const dailyAssignmentRelations = relations(dailyAssignment, ({ one }) => ({
  employee: one(employee, {
    fields: [dailyAssignment.employeeId],
    references: [employee.id],
  }),
  workstation: one(workstation, {
    fields: [dailyAssignment.workstationId],
    references: [workstation.id],
  }),
  user_assignedByUserId: one(user, {
    fields: [dailyAssignment.assignedByUserId],
    references: [user.id],
    relationName: 'dailyAssignment_assignedByUserId_user_id',
  }),
  user_endedByUserId: one(user, {
    fields: [dailyAssignment.endedByUserId],
    references: [user.id],
    relationName: 'dailyAssignment_endedByUserId_user_id',
  }),
}))

export const employeeMovementRelations = relations(employeeMovement, ({ one }) => ({
  employee: one(employee, {
    fields: [employeeMovement.employeeId],
    references: [employee.id],
  }),
  workstation_fromWorkstationId: one(workstation, {
    fields: [employeeMovement.fromWorkstationId],
    references: [workstation.id],
    relationName: 'employeeMovement_fromWorkstationId_workstation_id',
  }),
  workstation_toWorkstationId: one(workstation, {
    fields: [employeeMovement.toWorkstationId],
    references: [workstation.id],
    relationName: 'employeeMovement_toWorkstationId_workstation_id',
  }),
  user: one(user, {
    fields: [employeeMovement.movedByUserId],
    references: [user.id],
  }),
}))

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employee, {
    fields: [attendance.employeeId],
    references: [employee.id],
  }),
  user: one(user, {
    fields: [attendance.registeredByUserId],
    references: [user.id],
  }),
}))

export const pendingMoveRelations = relations(pendingMove, ({ one }) => ({
  employee: one(employee, {
    fields: [pendingMove.employeeId],
    references: [employee.id],
  }),
  workstation_fromWorkstationId: one(workstation, {
    fields: [pendingMove.fromWorkstationId],
    references: [workstation.id],
    relationName: 'pendingMove_fromWorkstationId_workstation_id',
  }),
  workstation_toWorkstationId: one(workstation, {
    fields: [pendingMove.toWorkstationId],
    references: [workstation.id],
    relationName: 'pendingMove_toWorkstationId_workstation_id',
  }),
  user_requestedByUserId: one(user, {
    fields: [pendingMove.requestedByUserId],
    references: [user.id],
    relationName: 'pendingMove_requestedByUserId_user_id',
  }),
  user_resolvedByUserId: one(user, {
    fields: [pendingMove.resolvedByUserId],
    references: [user.id],
    relationName: 'pendingMove_resolvedByUserId_user_id',
  }),
}))

export const userModulePermissionRelations = relations(userModulePermission, ({ one }) => ({
  user: one(user, {
    fields: [userModulePermission.userId],
    references: [user.id],
  }),
}))
