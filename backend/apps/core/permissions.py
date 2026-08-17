from apps.hierarchy.models import UserProfile, Facility


def get_user_profile(user):
    """
    Returns the UserProfile for a user.
    Creates a default ADMIN profile for superusers with no profile.
    """
    try:
        return user.profile
    except UserProfile.DoesNotExist:
        if user.is_superuser:
            profile = UserProfile.objects.create(user=user, role='ADMIN')
            return profile
        return None


def get_accessible_facilities(user):
    """
    Returns a queryset of facilities the user can access.
    - Superusers and ADMIN role: all active facilities
    - REGIONAL_MANAGER and FACILITY_OWNER: only assigned facilities
    """
    if user.is_superuser:
        return Facility.objects.filter(is_active=True)

    profile = get_user_profile(user)
    if not profile:
        return Facility.objects.none()

    return profile.accessible_facilities


class FacilityFilterMixin:
    """
    Mixin for ViewSets that filters querysets based on
    the user's role and assigned facilities.

    Usage: add to any ViewSet that has a facility FK or
    a path to facility via related models.

    Subclasses must define:
        facility_field = 'facility'   # field path to facility FK
    """
    facility_field = 'facility'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        print(f"[MIXIN] get_queryset called for {user.username}, is_superuser={user.is_superuser}")

        if user.is_superuser:
            return qs

        profile = get_user_profile(user)
        if not profile:
            return qs.none()

        if profile.is_admin:
            return qs

        accessible = profile.accessible_facilities
        return qs.filter(**{f'{self.facility_field}__in': accessible})