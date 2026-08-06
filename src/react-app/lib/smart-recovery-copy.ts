import type { SmartRecoveryDashboard } from './smart-recovery-api'

export function smartRecoveryUnavailableMessage(
  reason: SmartRecoveryDashboard['recoveryUnavailableReason'],
): string {
  switch (reason) {
    case 'not_enough_evidence':
      return 'Complete more generated questions to unlock a targeted set.'
    case 'no_current_weakness':
      return 'No current weak skill needs a targeted set.'
    case 'no_generatable_skills':
      return 'Your current weak skills do not have an eligible targeted generator.'
    case 'insufficient_fresh_questions':
      return 'You’ve recently trained your current priority skills. Complete more practice or assessments to unlock another fresh recovery set.'
    case 'active_attempt_exists':
      return 'Continue your current recovery set before starting another.'
    case 'configuration_unavailable':
      return 'Targeted recovery configuration is unavailable.'
    default:
      return 'Targeted recovery is not available yet.'
  }
}