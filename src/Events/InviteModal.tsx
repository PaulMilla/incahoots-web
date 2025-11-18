import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getEventAttendeesPublisher } from "@/lib/firestore";
import { inviteContacts } from "@/lib/inCahootsApi";
import { filterNullish } from "@/lib/rxjs";
import { Attendee, AttendeeInvite, EventInvitesBody } from "@/types";
import { ChevronRight, CircleHelp, FileQuestion, Loader2Icon, Mail, SquareCheck, SquareX, X } from "lucide-react";
import { useEffect, useState } from "react";

export function InviteModal({ eventId }: { eventId?: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [dialogState, setDialogState] = useState<"initialized"|"inProgress"|"error">("initialized");

  useEffect(() => {
    if (!eventId) {
      console.error("Event id not found in query params");
      return;
    }

    const eventAttendeesSubscription = getEventAttendeesPublisher(eventId)
      .pipe(filterNullish())
      .subscribe((attendees: Attendee[]) => {
        setAttendees(attendees);
      });

    return () => {
      eventAttendeesSubscription.unsubscribe();
    };
  }, [eventId]);


  const removeInvite = (person: Person) => {
    const newPeople = people.filter(x => x != person)
    setPeople(newPeople)
  }

  const onAddInvite = (person: Person) => {
    setPeople([person, ...people])
  }

  const onSubmitInvites = async () => {
    setDialogState("inProgress");
    
    try {
      const eventInvitesBody = {
        eventId: eventId ?? "",
        newAttendees: people.map(x => {
          return {
            isHost: false,
            fullName: x.name ?? "",
            phoneNumber: x.phone,
            email: x.email,
          } as AttendeeInvite
        })
      } as EventInvitesBody;

      console.log("Submitting invites", eventInvitesBody);
      const response = await inviteContacts(eventInvitesBody);

      if (response.success) {
        console.log("Invites sent successfully");
        setPeople([]); // Clear the invite list after sending
        setDialogState("initialized");
        setIsDialogOpen(false); // Close the dialog after sending invites
      } else {
        setDialogState("error");
        console.error("Failed to send invites", response);
      }
    } catch (error) {
      setDialogState("error");
      console.log("Error sending invites", error);
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Invite Contacts</Button>
      </DialogTrigger>
      {/* <DialogContent className="sm:max-w-[425px]"> */}
      <DialogContent>

        <DialogHeader>
          <DialogTitle>Invite Contacts</DialogTitle>
          <DialogDescription>
            Invite your friends here!
          </DialogDescription>
        </DialogHeader>

        <CommandBox onAddInvite={onAddInvite} people={people} attendees={attendees} removeInvite={removeInvite} />

        <DialogFooter>
          <DialogDescription>
            Adding invites to a draft event doesn't send them out until the event is published
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {dialogState === "inProgress" && (
            <Button size="sm" disabled>
              <Loader2Icon className="animate-spin" />
            </Button>
          )}
          {dialogState === "error" && (
            <Button variant="destructive" size="sm" onClick={() => setDialogState("initialized")}>
              Error sending invites, try again
            </Button>
          )}
          {dialogState === "initialized" && (
            <Button type="submit" onClick={() => onSubmitInvites()}>Send Invites</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CommandBox({
  onAddInvite,
  people,
  attendees,
  removeInvite
}: {
  onAddInvite: (person: Person) => void;
  people: Person[];
  attendees: Attendee[];
  removeInvite: (person: Person) => void;
}) {
  const [searchValue, setSearchValue] = useState<string>()
  const [pages, setPages] = useState<string[]>([])
  const page = pages[pages.length - 1]

  const onSubmitPerson = (person: Person) => {
    onAddInvite(person)
    setPages((pages) => pages.slice(0, -1));
    setSearchValue("")
  };

  return (
    <Command onKeyUp={(e) => {
      // Escape goes to previous page
      // Backspace goes to previous page when search is empty
      if (e.key === 'Escape' || (e.code === 'Backspace' && !searchValue)) {
        e.preventDefault()
        setPages((pages) => pages.slice(0, -1))
      }
    }}>
      <div className="w-full mb-4">
        <CommandInput placeholder="Type a person's name, email, or phone number..." value={searchValue} onValueChange={setSearchValue} />
      </div>

      <div id="DialogBody" className="flex items-start space-x-4">
        <div id="DialogBody-Left" className="flex-1">
          <CommandList>
            {!page && !searchValue && (
              <CommandEmpty>No recent contacts. Try adding some manually using the quick add option...</CommandEmpty>
            )}
            {!page && searchValue && (
              <CommandGroup forceMount heading="Quick add..">
                <CommandItem forceMount onSelect={() => setPages([...pages, 'quickAdd'])} >Quick add contact for {searchValue}..</CommandItem>
              </CommandGroup>
            )}
            {page === "quickAdd" && searchValue && (
              <QuickAddForm searchValue={searchValue} onSubmit={onSubmitPerson} />
            )}
          </CommandList>
        </div>
        <Separator orientation="vertical" />
        <div id="DialogBody-Right" className="flex-1">
          <h1 className="text-lg mb-2">Guest List</h1>
          <ScrollArea className="min-h-[200px] max-h-[500px] rounded-md border p-2">
            {people.map(x =>
              <GuestListItem key={x.id} person={x} actionType={ActionType.remove} onActionClicked={() => removeInvite(x)} />
            )}
            {attendees.map(x =>
              <GuestListAttendee key={x.id} attendee={x} />
            )}
          </ScrollArea>
        </div>
      </div>
    </Command>
  )
}

function QuickAddForm({ searchValue, onSubmit }: { searchValue: string, onSubmit: (person: Person) => void }) {
  const searchType =
    searchValue.includes('@') ? 'email'
      : /^[0-9-]+$/.test(searchValue) ? 'phone'
        : 'name';

  // TOOD: Replace with React Hook Form from shadcn: https://ui.shadcn.com/docs/components/form
  const [name, setName] = useState<string>(searchType == 'name' ? searchValue : '')
  const [email, setEmail] = useState<string>(searchType == 'email' ? searchValue : '')
  const [phone, setPhone] = useState<string>(searchType == 'phone' ? searchValue : '')

  return (
    <div className="p-2">
      <h1 className="text-md">Quick Add...</h1>
      <h3 className="text-sm">Either email or phone must be defined</h3>
      <Input placeholder="Name (optional)" value={name} autoFocus={searchType != 'name'} type="text" onChange={e => setName(e.currentTarget.value)}></Input>
      <Input placeholder="Email (optional)" value={email} autoFocus={searchType == 'name'} type="email" onChange={e => setEmail(e.currentTarget.value)}></Input>
      <Input placeholder="Phone (optional)" value={phone} type="phone" onChange={e => setPhone(e.currentTarget.value)}></Input>
      <Button asChild variant={"outline"}>
        <ChevronRight onClick={() => { onSubmit({ id: uuidv4(), name, email, phone } as Person) }} />
      </Button>
    </div>
  )
}

enum ActionType {
  'remove',
  'add',
  'moreInfo'
}

function GuestListAttendee({ attendee }: { attendee: Attendee, actionType?: ActionType, onActionClicked?: () => void }) {
  return (
    <div className="flex space-x-2 justify-between">
      <span key={attendee.id}>{attendee.fullName ?? "???"}</span>
      {attendee.rsvpState === 'going' && (<SquareCheck />)}
      {attendee.rsvpState === 'notGoing' && (<SquareX />)}
      {attendee.rsvpState === 'maybe' && (<CircleHelp />)}
      {attendee.rsvpState === 'unknown' && (<Mail />)}
    </div>
  )
}

function GuestListItem({ person, actionType, onActionClicked }: { person: Person, actionType?: ActionType, onActionClicked?: () => void }) {
  const actionButton = () => {
    switch (actionType) {
      case ActionType.remove: return (<X onClick={onActionClicked} />)
      default: return (<FileQuestion onClick={onActionClicked} />)
    }
  };

  return (
    <div className="flex space-x-2 justify-between">
      <span key={person.id}>{person.name ?? (person.idType == 'phone' ? person.phone : person.email) ?? "???"}</span>
      {actionType !== undefined ? actionButton() : <></>}
    </div>
  )
}

class Person {
  id!: string;
  idType!: "phone" | "email";
  name?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
}

// TODO: Fix this with real ID definitions
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
