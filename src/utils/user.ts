export function getInitials(fullName: string) {
    const names = fullName.split(" ");
    const initials = names.map((name) => name[0].toUpperCase()).join("");
    return initials;
}
