import i18n from '../i18n'

export function getRoleLabels() {
  return {
    ADMINISTRADOR: i18n.t('app:roleLabels.administrador'),
    SUPERVISOR: i18n.t('app:roleLabels.supervisor'),
    LIDER: i18n.t('app:roleLabels.lider'),
  }
}
